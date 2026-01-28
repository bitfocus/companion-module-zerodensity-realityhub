// tools
import got from 'got'


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
                for (const property of (Array.isArray(response) ? response : [])) {
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

export const isEqual = (element1, element2) => {

    if (element1 === element2) return true

    if (typeof element1 !== typeof element2) return false

    if (element1 instanceof Object && element2 instanceof Object) {
        const keysElement1 = Object.keys(element1)
        const keysElement2 = Object.keys(element2)

        if (keysElement1.length !== keysElement2.length) return false

        for (const key of keysElement1) {
            if (!isEqual(element1[key], element2[key])) return false
        }
    }
    else if (element1 instanceof Array && element2 instanceof Array) {

        if (element1.length !== element2.length) return false

        for (const i=0; i<element1.length; i++) {
            if (!isEqual(element1[i], element2[i])) return false
        }
    }
    else if (element1 instanceof Date && element2 instanceof Date) {
        if (element1.getTime() === element2.getTime()) return true
    }
    else return false

    return true
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


export class requestCue {
    constructor() {
        this.cueHigh = []
        this.cueNormal = []
    }

    async sendRequest({ method, url, parameters }) {
        return await got[method](url, parameters)
    }

    addRequestToCue(method, url, parameters) {
        
    }

    async GET(url, params={}) {

    }
}