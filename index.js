// index

import { InstanceBase, runEntrypoint } from '@companion-module/base'
import got from 'got'
import _ from 'lodash'
import { upgradeScripts } from './upgrade.js'
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
				updateEngines: new defaultTimer(this.pollEngines, this),
				updateNodes: new defaultTimer(this.pollNodes, this),
				updateRundowns: new defaultTimer(this.pollRundowns, this),
				updateTemplates: new defaultTimer(this.pollTemplates, this)
			}
		}

		// create executors
		this.executors = {
			variables: new variableExecutor(this)
		}

		// create cue object for requests with descending priority
		this.rCue = {
			high: [],
			medium: [],
			low: []
		}

	}

	// handle module shutdown
	async destroy() {
		this.enableRequests = false
		this.connectionEstablished = false
		this.moduleInitiated = false

		this.data.timer.updateEngines.stop()
		this.data.timer.updateNodes.stop()
		this.data.timer.updateRundowns.stop()
		this.data.timer.updateTemplates.stop()
		this.executors.variables.stop()
	}

	// create config fields
	getConfigFields = () => createConfigFields

	// run "configUpdated()" when module gets enabled
	init = async (config) => this.configUpdated(config)

	async initModule() {

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
		
		this.log('info', 'Connection succeeded!')
		this.connectionEstablished = true
		this.outputErrors = true

		this.updateStatus('LOAD: Engines data ...')
		this.log('info', 'Load engines data...')
		await this.pollEngines(this) // request engines data
		this.log('info', `${Object.keys(this.data.engines).length} engines found!`)

		if (contains(this.config.features, 'rundowns')) { // check if rundowns feature is selected in config
			this.updateStatus('LOAD: Rundowns data ...', '0%')
			this.log('info', 'Load rundowns data...')
			await this.pollRundowns(this) // request rundowns data
			this.log('info', `${Object.keys(this.data.rundowns).length} rundowns found!`)
		}

		if (contains(this.config.features, 'templates')) { // check if templates feature is selected in config
			this.updateStatus('LOAD: Templates data ...', '0%')
			this.log('info', 'Load templates data...')
			await this.pollTemplates(this) // request templates data
			this.log('info', `${Object.keys(Object.values(this.data.templates)[0].items).length} templates found!`)
		}

		if (contains(this.config.features, 'nodes')) { // check if nodes feature is selected in config
			this.updateStatus('LOAD: Nodes data ...', '0%')
			this.log('info', 'Load nodes data...')
			await this.pollNodes(this) // request nodes data
			let allNodes = 0
			for (const nodes of Object.values(this.data.nodes)) allNodes += Object.keys(nodes).length
			this.log('info', `${allNodes} nodes found!`)
		}

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

	async initRequests(interval) { 
		this.enableRequests = true

		// create time variable to send request in given interval
		let last = Date.now()

		// start loop for sending requests from cue
		while (this.enableRequests) {
			// send highest priority first
			if (this.rCue.high.length > 0) this.rCue.high.shift()()

			// send 'medium' priority if no 'high' priority is in cue
			else if (this.rCue.medium.length > 0) this.rCue.medium.shift()()

			// send 'low' priority if no 'high' or 'medium' priority is in cue
			else if (this.rCue.low.length > 0) this.rCue.low.shift()()

			// wait for 'interval' ms till next request to prevent overload
			if (last+interval > Date.now()) await SLEEP((last+interval)-Date.now())
			
			// updating time variable
			last = Date.now()
		}
	}

	// handle errors
	async errorModule(error='unknown error', subject='unknown subject') {
		// log new errors
		if (this.errors.last.error !== error && this.errors.last.subject !== subject) {
			this.errors.last = { error: error, subject: subject }
			this.log('error', `${error} for "${subject}"`)
			this.updateStatus(`ERROR: ${error}`)
		}

		// clear request cue if request errors occur
		if (['RequestError', 'TimeoutError'].includes(error)) {
			this.rCue = {
				high: [],
				medium: [],
				low: []
			}

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

		this.moduleInitiated = false

		this.data.timer.updateEngines.stop()
		this.data.timer.updateRundowns.stop()
		this.data.timer.updateTemplates.stop()
		this.executors.variables.stop()

		// start request loop if not already enabled
		if (!this.enableRequests) this.initRequests(10)

		// reconnect, if host changed
		if (this.config.host !== config.host || retry === true) {
			// update config variable
			this.config = config
			this.errors.last = {}

			this.updateStatus('connecting')
			this.log('info', 'Try to connect...')
			
			this.initModule()
		}
		// check if module can be initiated without reconnecting
		else if (this.connectionEstablished) {
			// update config variable
			this.config = config
			this.initModule()
		}
	}

	REQ(method, url, body, importance) {
		// create request parameters object
		const parameters = {
			responseType: 'json',
			timeout: this.requestTimeout
		}

		// add body to "parameters" object if not empty
		if (Object.keys(body).length > 0) parameters.json = body

		// return promise until response
		return new Promise((resolve) => {
			// handle "GET" requests
			if (method === 'GET') this.rCue[importance].push(() => {
				got.get(url, parameters).json().then((res) => resolve(res)).catch((error) => {
					this.errorModule(error.name, error.options.url)
					resolve(null)
				})
			})

			// handle "POST" requests
			else if (method === 'POST') this.rCue[importance].push(() => {
				got.post(url, parameters).json().then((res) => resolve(res)).catch((error) => {
					this.errorModule(error.name, error.options.url)
					resolve(null)
				})
			})
			
			// handle "PATCH" requests
			else if (method === 'PATCH') this.rCue[importance].push(() => {
				got.patch(url, parameters).json().then((res) => resolve(res)).catch((error) => {
					this.errorModule(error.name, error.options.url)
					resolve(null)
				})
			})
			else resolve(null)
		})
	}

	GET = async (endpoint, body={}, importance='high') => await this.REQ('GET', `http://${this.config.host}/api/rest/v1/${endpoint}`, body, importance)
	POST = async (endpoint, body={}, importance='high') => await this.REQ('POST', `http://${this.config.host}/api/rest/v1/${endpoint}`, body, importance)
	PATCH = async (endpoint, body={}, importance='high') => await this.REQ('PATCH', `http://${this.config.host}/api/rest/v1/${endpoint}`, body, importance)
}

runEntrypoint(RealityHubInstance, upgradeScripts)