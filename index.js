// index

import { InstanceBase, runEntrypoint } from '@companion-module/base'
import got from 'got'
import { upgradeScripts } from './upgrades.js'
import { createConfigFields } from './configFields.js'
import { getActions } from './actions.js'
import { getFeedbacks } from './feedbacks.js'
import { getVariables } from './variables.js'
import { getPresets } from './presets.js'
import { loadEngines } from './features/engines.js'
import { loadNodes } from './features/nodes.js'
import { loadRundowns } from './features/rundowns.js'
import { loadTemplates } from './features/templates.js'
import { SLEEP, contains, defaultTimer, variableExecutor } from './tools.js'
import { cueExecutor } from './cueExecutor.js'



class RealityHubInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// set request timeouts
		this.requestTimeout = {
			lookup: 1000,
			connect: 1000,
			secureConnect: 1000,
			socket: 1000,
			send: 1000,
			response: 1000
		}

		this.requestErrors = 0
		this.requestErrorThreshold = 10

		this.lastRequest = 0
		this.enableRequests = false
		this.connectionEstablished = false
		this.moduleInitiated = false
		this.initFunctionality = false // set to 'false' to indicate no actions, feedbacks etc. are defined

		// create feature variables
		this.pollEngines = loadEngines
		this.pollNodes = loadNodes
		this.pollRundowns = loadRundowns
		this.pollTemplates = loadTemplates

		this.updateVariables = (variables) => {
			Object.entries(variables).forEach(([variable, value]) => {
				this.executors.variables.append(variable, value)
			})
		}

		this.retryTimer = undefined

		// create empty config object
		this.config = {}

		// create object to track errors
		this.errors = {
			last: {},
			log: true
		}

		// create data object to store data from reality hub
		this.data = {
			engines: {},
			rundowns: {},
			templates: {},
			nodes: {},
			module: {
				updateEnginesData: false,
				updateEnginesDuration: 0,
				updateEnginesProgress: 0,
				updateRundownsData: false,
				updateRundownsDuration: 0,
				updateRundownsProgress: 0,
				updateTemplatesData: false,
				updateTemplatesDuration: 0,
				updateTemplatesProgress: 0,
				updateNodesData: false,
				updateNodesDuration: 0,
				updateNodesProgress: 0,
				inputNodeMappings: {},
				feedbackRequestActive: {},
			},
			timer: {
				updateEngines: new defaultTimer(() => {
					if (this.data.module.updateEnginesData === false) this.pollEngines(this)
				}, this),
				updateNodes: new defaultTimer(() => {
					if (this.data.module.updateNodesData === false) this.pollNodes(this)
				}, this),
				updateRundowns: new defaultTimer(() => {
					if (this.data.module.updateRundownsData === false) this.pollRundowns(this)
				}, this),
				updateTemplates: new defaultTimer(() => {
					if (this.data.module.updateTemplatesData === false) this.pollTemplates(this)
				}, this),
			}
		}

		// create executors
		this.executors = {
			variables: new variableExecutor(this),
			requests: new cueExecutor(['high', 'medium', 'low'])
		}
	}

	// handle module shutdown
	async destroy() {
		this.enableRequests = false
		this.moduleInitiated = false

		this.data.timer.updateEngines.stop()
		this.data.timer.updateNodes.stop()
		this.data.timer.updateRundowns.stop()
		this.data.timer.updateTemplates.stop()
		this.executors.variables.stop()
		this.executors.requests.block()
		await SLEEP(1000)
		this.executors.requests.clear()
	}

	// create config fields
	getConfigFields = () => createConfigFields

	// run "configUpdated()" when module gets enabled
	init = async (config) => this.configUpdated(config)

	async initModule(fastInit = false) {
		// request "engines" data to check connection to host
		if (await this.GET('engines') === null) {
			const retryDelay = 10
			this.moduleInitiated = false
			this.updateStatus('Connection Failed!')
			this.log('info', 'Connection failed!')
			this.log('debug', `Retry connection to host "${this.config.host}" in ${retryDelay}s`)

			// return if the module already retries
			if (this.retryTimer !== undefined) return

			// create retry timer
			this.retryTimer = setTimeout(() => {
				// return if connection is established now
				if (this.connectionEstablished === true) return

				// clear retry timer
				clearTimeout(this.retryTimer)
				this.retryTimer = undefined

				// run "configUpdated()" to try new connection
				this.configUpdated(this.config, true)
			}, retryDelay*1000)
			return
		}

		// start variable updater
		this.executors.variables.start(100)
		
		this.log('info', 'Connection succeeded!')
		this.connectionEstablished = true
		this.outputErrors = true

		this.data.module.updateEnginesProgress = 0
		this.data.module.updateEnginesDuration = 0
		this.data.module.updateNodesProgress = 0
		this.data.module.updateNodesDuration = 0
		this.data.module.updateRundownsProgress = 0
		this.data.module.updateRundownsDuration = 0
		this.data.module.updateTemplatesProgress = 0
		this.data.module.updateTemplatesDuration = 0

		if (this.enableRequests !== true) return

		this.updateStatus('LOAD: Engines data ...')
		this.log('info', 'Load engines data...')
		await this.pollEngines(this) // request engines data
		this.log('info', `${Object.keys(this.data.engines).length} engines found!`)

		// set action definitions
		this.setActionDefinitions(getActions(this))

		// set feedback definitions
		this.setFeedbackDefinitions(getFeedbacks(this))

		// update feedbacks
		this.checkFeedbacks()

		// get variable definitions and values
		const [def, val] = getVariables(this)

		// set variable definitions
		this.setVariableDefinitions(def)

		// set variable values
		this.setVariableValues(val)

		// set preset definitions
		this.setPresetDefinitions(getPresets(this))

		// check if rundowns feature is selected in config
		if (contains(this.config.features, 'rundowns') && this.enableRequests === true && fastInit === false) {
			this.updateStatus('LOAD: Rundowns data ...', '0%')
			this.log('info', 'Load rundowns data...')
			await this.pollRundowns(this) // request rundowns data
			this.log('info', `${Object.keys(this.data.rundowns).length} rundowns found!`)
		}

		// check if templates feature is selected in config
		if (contains(this.config.features, 'templates') && this.enableRequests === true && fastInit === false) {
			this.updateStatus('LOAD: Templates data ...', '0%')
			this.log('info', 'Load templates data...')
			await this.pollTemplates(this) // request templates data
			const templateValues = Object.values(this.data.templates)
			const templateCount = templateValues.length > 0 && templateValues[0]?.items 
				? Object.keys(templateValues[0].items).length 
				: 0
			this.log('info', `${templateCount} templates found!`)
		}

		// check if nodes feature is selected in config
		if (contains(this.config.features, 'nodes') && this.enableRequests === true && fastInit === false) {
			this.updateStatus('LOAD: Nodes data ...', '0%')
			this.log('info', 'Load nodes data...')
			await this.pollNodes(this) // request nodes data
			let allNodes = 0
			for (const nodes of Object.values(this.data.nodes)) allNodes += Object.keys(nodes).length
			this.log('info', `${allNodes} nodes found!`)
		}

		if (this.enableRequests !== true) return

		this.moduleInitiated = true
		this.updateStatus('ok')
		this.log('info', 'Instance ready to use!')

		this.autoUpdater()
	}

	async autoUpdater() {
		// start engines timer
		this.data.timer.updateEngines.start(5000)

		// check if "Auto-Update Nodes" is true
		if (this.config['nodes' + this.config.features.findIndex((element) => element === 'nodes')] === true) {
			this.data.timer.updateNodes.start(this.config.interval*1000)
			this.log('debug', `Auto updater for "nodes" data with delay of ${this.config.interval*1000}ms started!`)
		}

		// check if "Auto-Update Rundowns" is true
		if (this.config['rundowns' + this.config.features.findIndex((element) => element === 'rundowns')] === true) {
			this.data.timer.updateRundowns.start(this.config.interval*1000)
			this.log('debug', `Auto updater for "rundowns" data with delay of ${this.config.interval*1000}ms started!`)
		}

		// check if "Auto-Update Templates" is true
		if (this.config['templates' + this.config.features.findIndex((element) => element === 'templates')] === true) {
			this.data.timer.updateTemplates.start(this.config.interval*1000)
			this.log('debug', `Auto updater for "templates" data with delay of ${this.config.interval*1000}ms started!`)
		}


	}

	// handle errors
	async errorModule(error='unknown error', subject='unknown subject') {
		if (this.requestErrorThreshold > this.requestErrors) return

		// log new errors
		if (this.errors.last.error !== error && this.errors.last.subject !== subject) {
			this.errors.last = { error: error, subject: subject }
			this.log('error', `${error} for "${subject}"`)
			this.updateStatus((error === 'TimeoutError') ? 'ConnectionFailure' : `ERROR: ${error}`)
		}

		// clear request cue if request errors occur
		if (['RequestError', 'TimeoutError'].includes(error)) {
			this.executors.requests.clear()
			this.connectionEstablished = false

			if (await this.GET('engines') !== null) this.initModule()
		}
	}

	// update config and try to connect to init module
	async configUpdated(config, retry=false) {
		// check for valid ip address
		if (config.host.split('.').length !== 4 || (contains(config.features, 'templates') && config.name === '')) {
			this.updateStatus('Waiting for config!')
			return
		}

		let featuresChanged = false
		if (this.config.features === undefined) this.config.features = []
		for (const feature of config.features) if (!this.config.features.includes(feature)) featuresChanged = true
		for (const feature of this.config.features) if (!config.features.includes(feature)) featuresChanged = true

		await this.destroy()
		this.executors.requests.unblock()

		// reconnect, if host changed
		if (this.config.host !== config.host || retry === true || featuresChanged === true ) {
			// update config variable
			this.config = config
			this.errors.last = {}

			this.updateStatus('connecting')
			this.log('info', 'Try to connect...')
		
			this.enableRequests = true
			this.moduleInitiated = false
			this.initModule()
		}
		// check if module can be initiated without reconnecting
		else if (this.connectionEstablished) {
			// update config variable
			this.config = config
		
			this.enableRequests = true
			this.initModule(true)
		}
	}

	async REQ(method, url, body, channel) {
		// return null if requests are not allowed
		if (this.enableRequests !== true) return null

		// create request parameters object
		const parameters = {
			responseType: 'json',
			timeout: this.requestTimeout,
			headers: {}
		}

		// add API key header if configured (for RealityHub 2.1+)
		if (this.config.apiKey && this.config.apiKey.trim() !== '') {
			parameters.headers['X-API-Key'] = this.config.apiKey.trim()
		}

		// add body to "parameters" object if not empty
		if (Object.keys(body).length > 0) parameters.json = body

		let response = null

		try {
			// handle "GET" requests
			if (method === 'GET') response = await got.get(url, parameters).json()

			// handle "POST" requests
			else if (method === 'POST') response = await got.post(url, parameters).json()

			// handle "PATCH" requests
			else if (method === 'PATCH') response = await got.patch(url, parameters).json()

			// handle "PUT" requests
			else if (method === 'PUT') response = await got.put(url, parameters).json()

			// handle "DELETE" requests
			else if (method === 'DELETE') response = await got.delete(url, parameters).json()

			this.requestErrors = 0
		}
		catch(error) {
			this.requestErrors++
			// Enhanced error handling for API key issues
			if (error.response?.statusCode === 401) {
				this.log('error', 'Authentication failed! Please check your API key.')
				this.errorModule('Unauthorized', error.options?.url || url)
			} else if (error.response?.statusCode === 403) {
				this.log('error', 'Access forbidden! API key may be invalid or expired.')
				this.errorModule('Forbidden', error.options?.url || url)
			} else {
				this.errorModule(error.name, error.options?.url || url)
			}
		}
		finally {
			// log request debug message if enabled
			if (this.config.debugRequests === true) this.log('debug', `${method} request "${url}"`)

			// return null if requests are not allowed
			if (this.enableRequests !== true) return null

			// return response
			return response
		}
	}

	GET = async (endpoint, body={}, importance='high') => this.REQ('GET', `http://${this.config.host}/api/rest/v1/${endpoint}`, body, importance)
	POST = async (endpoint, body={}, importance='high') => this.REQ('POST', `http://${this.config.host}/api/rest/v1/${endpoint}`, body, importance)
	PATCH = async (endpoint, body={}, importance='high') => this.REQ('PATCH', `http://${this.config.host}/api/rest/v1/${endpoint}`, body, importance)
	PUT = async (endpoint, body={}, importance='high') => this.REQ('PUT', `http://${this.config.host}/api/rest/v1/${endpoint}`, body, importance)
	DELETE = async (endpoint, body={}, importance='high') => this.REQ('DELETE', `http://${this.config.host}/api/rest/v1/${endpoint}`, body, importance)
}

runEntrypoint(RealityHubInstance, upgradeScripts)