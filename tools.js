// tools



export const featureLogic = (options, data) => {
    if (options.data !== data.id) return false
    if (data.config.features.findIndex((element) => element === data.feature) !== -1) return false
    return true
}

export const keyValueLogic = (options, data) => {
    for (const [k, v] of Object.entries(data)) {
        if (options[k] !== v) return false
    }
    return true
}

export const sDecode = (string) => {
    if (typeof string !== 'string') return undefined
    return Buffer.from(string.replaceAll('_p', '+').replaceAll('_s', '/').replaceAll('_e', '='), 'base64').toString('utf8')
}

function sPath(object, path) {
    path = path.replace(/\[(\w+)\]/g, '.$1') // convert indexes to properties
    path = path.replace(/^\./, '') // strip a leading dot
    const pSteps = path.split('.') // split path to steps
    for (let i = 0, n = pSteps.length; i < n; ++i) {
        const step = pSteps[i]
        if (step in object) object = object[step]
        else return
    }
    return object;
}

export const ms2S = (ms) => {
    if (ms < 10000) return Math.ceil(ms/100)/10
    else return Math.ceil(ms/1000)
}

export const parseOptions = (str, keys) => {
    const pos = []
    const out = {}

    for (let i=0; i<str.length-2; i++) {
        if (keys.includes(str.substring(i, i+3))) {
            pos.push(i)
            pos.push(i+3)
        }
    }
    pos.push(str.length)

    for (let i=0; i<pos.length-1; i+=2) out[str.slice(pos[i], pos[i+1])] = str.slice(pos[i+1], pos[i+2])

    for (const key of keys) if (!Object.keys(out).includes(key)) out[key] = null

    return out
}

export const SLEEP = (time) => new Promise(resolve => setTimeout(resolve, time))

export const sString = (input) => { return encodeURIComponent(input) }

export const contains = (list, item) => (Array.isArray(list) && list.includes(item))

export const eMatch = (items, path) => {
    try {
        const ref = items[0]
        for (const item of items) {
            if (sPath(item, path) !== sPath(ref, path)) return false
        }
    }
    catch { return false }
    return true
}

export const simple = (a, b, invert=false) => {
    if (a == b) {
        return (invert) ? false : true
    }
    return (invert) ? true : false
}

export const sNodes = (path, node, nodes) => {
    for (const engine of Object.keys(nodes)) {
        for (let i=0; i < Object.keys(node.properties).length; i++) {
            if (nodes[engine][path] === undefined) return false
            if (Object.keys(node.properties)[i] !== Object.keys(nodes[engine][path].properties)[i]) return false
        }
        if (Object.keys(node.functions).length > 0) {
            for (let i=0; i < Object.keys(node.functions).length; i++) {
                if (Object.keys(node.functions)[i] !== Object.keys(nodes[engine][path].functions)[i]) return false
            }
        }
    }
    return true
}

export const deepSetProperty = (object, path=[], value=undefined) => {
    if (path.length === 0) return

    for (let i=0; i<path.length; i++) {
        if (i+1 === path.length) object[path[i]] = value
        else if (object[path[i]] === undefined) object[path[i]] = {}
        object = object[path[i]]
    }
}

export const aNodes = (nodes) => {
    let num = 0
    for (const [engine, eNodes] of Object.entries(nodes)) {
        if (engine === '#all#') continue
        num += Object.keys(eNodes).length
    }
    return num
}

export const engineSelection = (inst) => {
    const defaultEngines = []
    const engineChoices = []
    for (const [id, engine] of Object.entries(inst.data.engines)) {
        defaultEngines.push(id)
        engineChoices.push({ id: id, label: engine.displayName })
    }

    return {
        type: 'multidropdown',
        id: 'engines',
        label: 'Select Engines:',
        default: defaultEngines,
        choices: engineChoices,
        tooltip: 'Select target engines for this action or feedback'
    }
}

export const featureInactive = (feature, name, description) => {
    return {
        name: name,
        description: description,
        options: [
            {
                type: 'static-text',
                id: 'action',
                label: `Please select the "${feature}" feature!`,
            },
            {
                type: 'static-text',
                id: 'instruction',
                label: `(Connections > Module > Edit connection > Select additional Features > ${feature})`,
            }
        ],
        callback: async (event) => {}
    }
}

export const basicFeedback = (inst, event, data) => {
    // return "false" if no engine selected
    if (event.options.engines.length === 0) return false

    // loop over all selected engines
    for (const engine of event.options.engines) {
        // if needed data is unavailable, request data from server
        if (inst.data.nodes[engine] === undefined || inst.data.nodes[engine][event.options.node] === undefined) {
            // if needed data is aleready requested, return "false"
            if (inst.data.module.feedbackRequestActive[`/e:${engine}/n:${event.options.node}`] === true) return false

            // request data from server
            inst.data.module.feedbackRequestActive[`/e:${engine}/n:${event.options.node}`] = true
            inst.log('debug', `FeedbackRequestActive: "/e:${engine}/n:${event.options.node}"`)
            inst.GET(`engines/${engine}/nodes/${sString(event.options.node)}/properties`, {}, 'medium').then((response) => {
                for (const property of response) {
                    if (data.requestProperties.includes(property.PropertyPath)) {
                        deepSetProperty(
                            inst.data.nodes,
                            [ engine, event.options.node, 'properties', property.PropertyPath ],
                            property.Value
                        )
                    }
                }

                inst.data.module.feedbackRequestActive[`/e:${engine}/n:${event.options.node}`] = false

                // if there was a valid response, check this feedback again to update buttons
                if (response.length > 0) inst.checkFeedbacks(event.feedbackId) 
            })

            // return "false" until async request is finished
            return false
        }

        // if feedback does not match current state, return "false"
        if (inst.data.nodes[engine][event.options.node].properties[data.property] !== data.value) return false
    }

    // if no mismatch, return "true"
    return true
}

export const convertToFunctionId = (name) => {
    // create empty string
    let convertedName = ''

    // loop over all words in "name"
    for (const word of name.split(' ')) {
        // add first charackter in upper case
        convertedName += word.slice(0, 1).toUpperCase()

        // add rest in lower case
        convertedName += word.slice(1).toLowerCase()
    }

    // return converted name
    return `Default//${convertedName}/0`
}

export const variablePath = (inst, name) => {
    const instanceLabel = (inst.label == undefined) ? 'RealityHub' : inst.label

    return `$(${instanceLabel}:${name})`
}

export const autoUpdateEnabled = (feature, inst) => {
    return inst.config[feature + inst.config.features.findIndex((element) => element === feature)]
}

export class defaultTimer { // creates new timer object
    constructor(func, inst) {
        this.func = func
        this.inst = inst
        this.active = false
        this.timeout = undefined
    }

    start(delay) { // starts timer

        // indicate active timer
        this.active = true

        // create new timer
        const timer = async () => {
            if (this.active !== true) return
            // set timeout for given delay
            this.timeout = setTimeout(async () => {

                // run function
                if (this.active === true) await this.func(this.inst)
    
                // restart timer
                if (this.active === true) timer(delay)
            }, delay)
        }

        // run timer
        timer(delay)
    }

    stop() { // stops timer

        // indicate inactive timer
        this.active = false

        // clear timeout to stop execution of function
        if (this.timeout !== undefined) clearInterval(this.timeout)
        this.timeout = undefined
    }
}

export class variableExecutor {
    constructor(inst) {
        this.inst = inst
        this.enabled = false
        this.cue = []
        this.timer = undefined
    }

    start(interval) {
        this.enabled = true

        if (this.timer === undefined) this.timer = setInterval(() => {
            const variables = {}

            while(this.cue.length > 0) {
                const [variable, value] = this.cue.shift()
                variables[variable] = value
            }

            if (Object.keys(variables).length > 0) {
                this.inst.setVariableValues(variables)
            }
        }, interval)
    }

    stop() {
        this.enabled = false
        if (this.timer !== undefined) clearInterval(this.timer)
        this.timer = undefined
    }

    async append(variable, value) {
        this.cue.push([variable, value])
    }
}