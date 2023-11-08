// nodes

import { getActions } from '../actions.js'
import { getFeedbacks } from '../feedbacks.js'
import { keyValueLogic, ms2S, sString, isEqual } from '../tools.js'
import { engineSelection } from './engines.js'


// create input fields for node properties
const nodeInputOptions = (inputKeys) => {
    if (Object.keys(inputKeys).length === 0) return []
    const nodeInputs = []

    for (const [inputKey, data] of Object.entries(inputKeys)) {

        let label = inputKey + ':'
        if (['string', 'number'].includes(inputKey)) label = 'Value:'
        else if (inputKey === 'boolean') label = 'State:'
        else if (label.includes(',')) label = label.replace('Value,', '').replace(',', ' ')

        if (data.type === 'string') {
            nodeInputs.push({ // add textinput input
                type: 'textinput',
                id: inputKey,
                label: label,
                isVisibleData: { nodes: data.nodes, properties: data.properties },
                isVisible: (options, data) => data.nodes.includes(options.node) && data.properties.includes(options[options.node])
            })
        }
        else if (data.type === 'boolean') {
            nodeInputs.push({ // add checkbox input
                type: 'checkbox',
                id: inputKey,
                label: label,
                default: false,
                isVisibleData: { nodes: data.nodes, properties: data.properties },
                isVisible: (options, data) => data.nodes.includes(options.node) && data.properties.includes(options[options.node])
            })
        }
        else if (data.type === 'number') {
            nodeInputs.push({ // add number input
                type: 'number',
                id: inputKey,
                label: label,
                step: 0.1,
                isVisibleData: { nodes: data.nodes, properties: data.properties },
                isVisible: (options, data) => data.nodes.includes(options.node) && data.properties.includes(options[options.node])
            })
        }
    }

    return nodeInputs
}

// polling data related to nodes
export const loadNodes = async (inst) => {

    // indicate avtive nodes loading
    inst.data.module.updateNodesData = true

    // update "basicDataLoading" feedback
    inst.checkFeedbacks('basicDataLoading')

    // save start time to calculate elapsed time
    const start = Date.now()

    // set progress to 0%
    inst.data.module.updateNodesProgress = 0

    // update "updateNodesProgress" variable
    inst.updateVariables({ updateNodesProgress:  inst.data.module.updateNodesProgress + '%' })

    const nodes = {}
    const engines = Object.keys(inst.data.engines).length

    let totalSteps = 0
    let currentStep = 0
    const singleSteps = []

    // loop over all available engines
    for (const engine of Object.keys(inst.data.engines)) {

        // continue loop if engines has no active project loaded
        if (!inst.data.engines[engine].activeProject) continue

        // create parameter for current engine in "nodes" object
        nodes[engine] = {}

        // request nodes data with "low" priority
        const nodesData = await inst.GET(`engines/${engine}/nodes`, {}, 'low')

        // increase current step
        currentStep++

        // check if nodes request was successfull and response has at least 1 node
        if (nodesData !== null && Array.isArray(nodesData) && nodesData.length > 0) {

            // calculate total steps to show real time progress
            singleSteps.push(nodesData.length)
            totalSteps = 0
            singleSteps.forEach((steps) => { totalSteps += steps })
            totalSteps = Math.round(totalSteps*engines/singleSteps.length) + engines

            // loop over all nodes
            for (const node of nodesData) {

                // create node path for current engine parameter in "nodes" object
                nodes[engine][node.NodePath] = {
                    properties: {},
                    functions: []
                }

                // request properties of current node in current engine with "low" priority
                const propertiesData = await inst.GET(`engines/${engine}/nodes/${sString(node.NodePath)}/properties`, {}, 'low')

                // increase current step
                currentStep++

                // check if node properties request was successfull and response has at least 1 property
                if (propertiesData !== null && Array.isArray(propertiesData) && propertiesData.length > 0) {

                    // loop over all properties
                    for (const property of propertiesData) {

                        // ignore 'Debug' and 'Node'specific properties
                        if (property.PropertyPath.startsWith('Node') || property.PropertyPath.startsWith('Debug')) { continue }

                        // create property path parameter and add property value to current node of current engine in "nodes" object
                        nodes[engine][node.NodePath].properties[property.PropertyPath] = property.Value
                    }
                }

                // request properties of current node in current engine with "low" priority
                const functionsData = await inst.GET(`engines/${engine}/nodes/${sString(node.NodePath)}/functions`, {}, 'low')
                    
                // check if node functions request was successfull and response has at least 1 function
                if (functionsData !== null && Array.isArray(functionsData) && functionsData.length > 0) {

                    // loop over all functions
                    for (const func of functionsData) {
                        // add function path parameter to for current node of current engine in "nodes" object
                        nodes[engine][node.NodePath].functions.push(func.FunctionPath)
                    }
                }

                // update progress if current step is below total steps
                if (currentStep < totalSteps) {
                    inst.data.module.updateNodesProgress = Math.floor(100*currentStep/totalSteps)
                    inst.updateVariables({ updateNodesProgress: inst.data.module.updateNodesProgress + '%' })
                    if (!inst.moduleInitiated) inst.updateStatus('LOAD: Nodes data ...', inst.data.module.updateNodesProgress + '%')
                }
            }
        }

        if (!inst.moduleInitiated) inst.log('info', `${Object.keys(nodes[engine]).length} nodes loaded from ${inst.data.engines[engine].displayName}`)
    }

    // checks for a change, if request shows same data, don't update
    if (!isEqual(inst.data.nodes, nodes)) {
        inst.data.nodes = nodes
        inst.setActionDefinitions(getActions(inst))
        inst.setFeedbackDefinitions(getFeedbacks(inst))
        inst.checkFeedbacks('nodesProperty')
    }

    // set progress to 100%
    inst.data.module.updateNodesProgress = 100

    // save elapsed time
    inst.data.module.updateNodesDuration = Date.now()-start

    // update variables
    inst.updateVariables({
        updateNodesProgress:  inst.data.module.updateNodesProgress + '%',
        updateNodesDuration: `${ms2S(inst.data.module.updateNodesDuration)}s`,
    })

    // indicate inavtive nodes loading
    inst.data.module.updateNodesData = false

    // update "basicDataLoading" feedback
    inst.checkFeedbacks('basicDataLoading')
}

// create array of node property inputs with visibility logic
export const nodePropertiesOptions = (inst) => {

    const nodes = {}
    const inputKeys = []

    // create option to select node from dropdown
    const nodeOption = {
        type: 'dropdown',
        label: 'Node:',
        id: 'node',
        default: 'select node!',
        choices: [],
        tooltip: 'Select node where properties should be changed. Node names should match across all engines!'
    }

    const propertyOptions = []

    // loop over all engines
    for (const engine of Object.keys(inst.data.engines)) {

        // continue loop if engine has no nodes
        if (inst.data.nodes[engine] === undefined) continue

        // loop over all nodes
        for (const node of Object.keys(inst.data.nodes[engine])) {
            // set default node
            if (nodeOption.default === 'select node!') nodeOption.default = node

            // add node to "nodes" object and "nodeOption.choices" if not already added
            if (nodes[node] === undefined) {
                nodes[node] = {}
                nodeOption.choices.push({ id: node, label: node })
            }

            // continue loop if no properties available
            if (inst.data.nodes[engine][node].properties === undefined) continue

            // loop over all properties of current node
            for (const property of Object.keys(inst.data.nodes[engine][node].properties)) {
                // ignore 'Debug' and 'Node' specific properties
                if (property.startsWith('Debug') || property.startsWith('Node')) continue 

                // get property type
                let type = typeof inst.data.nodes[engine][node].properties[property]
                const propertyTypes = []

                // get property types of sub properties
                if (type === 'object') {
                    for (const propertyKey of Object.keys(inst.data.nodes[engine][node].properties[property])) {
                        const propertyKeys = []
                        const propertyKeyValue = inst.data.nodes[engine][node].properties[property][propertyKey]

                        if (typeof propertyKeyValue === 'object') {
                            for (const propertySubKey of Object.keys(propertyKeyValue)) {
                                propertyKeys.push({[typeof propertyKeyValue[propertySubKey]]: `${propertyKey},${propertySubKey}`})
                            }
                        }
                        else propertyKeys.push({[typeof propertyKeyValue]: 'Value,' + propertyKey})

                        for (const data of propertyKeys) {
                            const [type, key] = Object.entries(data)[0]
                            if (inputKeys[key] === undefined) inputKeys[key] = {
                                type: type,
                                nodes: [],
                                properties: []
                            }
                            inputKeys[key].nodes.push(node)
                            inputKeys[key].properties.push(property)
                            propertyTypes.push(key)
                        }
                    }
                }

                // get property type of single property
                else {
                    if (inputKeys[type] === undefined) inputKeys[type] = {
                        type: type,
                        nodes: [],
                        properties: []
                    }
                    inputKeys[type].nodes.push(node)
                    inputKeys[type].properties.push(property)
                    propertyTypes.push(type)
                }

                // add property and list of property types to "nodes" object
                nodes[node][property] = propertyTypes
            }
            
        }
    }

    // loop over all nodes in "nodes" object
    for (const [node, properties] of Object.entries(nodes)) {
        // create property option for current node properties
        const propertyOption = {
            type: 'dropdown',
            label: 'Property:',
            id: node,
            default: 'select property!',
            choices: [],
            isVisibleData: { node: node },
            isVisible: keyValueLogic
        }

        // loop over all properties of current node
        for (const [property, types] of Object.entries(properties)) {
            // set default property
            if (propertyOption.default === 'select property!') propertyOption.default = property

            // create a more readable string for the property dropdown label
            const path = { value: '' }
            for (let i=property.length; i>=0; i--) {
                if (property[i] === '/') {
                    if (path.num === undefined) path.num = path.value
                    else if (path.prop === undefined) path.prop = path.value
                    else {
                        path.label = property.slice(0, i) + ' > '
                        if (path.value !== '') path.label += path.value + ' > '
                        path.label += path.prop
                        break
                    }
                    path.value = ''
                }
                else path.value = property[i] + path.value
            }

            // add property to "propertyOption.choices"
            propertyOption.choices.push({ id: property, label: path.label })
        }

        // add property option if property has choices
        if (propertyOption.choices.length > 0) propertyOptions.push(propertyOption)
    }

    // set global input node mappings
    inst.data.module.inputNodeMappings = inputKeys

    // return list of all options
    return [ engineSelection(inst), nodeOption ].concat(propertyOptions).concat(nodeInputOptions(inputKeys))
}

// create array of node function inputs with visibility logic
export const nodeFunctionsOptions = (inst) => {

    const nodes = {}

    // create option to select node from dropdown
    const nodeOption = {
        type: 'dropdown',
        label: 'Node:',
        id: 'node',
        default: 'select node!',
        choices: [],
        tooltip: 'Select node where properties should be changed. Node names should match across all engines!'
    }

    const functionOptions = []

    // loop over all engines
    for (const engine of Object.keys(inst.data.engines)) {

        // continue loop if engine has no nodes
        if (inst.data.nodes[engine] === undefined) continue

        // loop over all nodes
        for (const node of Object.keys(inst.data.nodes[engine])) {
            // set default node
            if (nodeOption.default === 'select node!') nodeOption.default = node

            // add node to "nodes" object and "nodeOption.choices" if not already added
            if (nodes[node] === undefined) {
                nodes[node] = []
                nodeOption.choices.push({ id: node, label: node })
            }

            // continue loop if no function available
            if (inst.data.nodes[engine][node].functions === undefined) continue

            // loop over all functions of current node
            for (const nodeFunction of inst.data.nodes[engine][node].functions) {
                // add function to "nodes" object if not already
                if (!nodes[node].includes(nodeFunction)) nodes[node].push(nodeFunction)
            }
            
        }
    }

    // loop over all nodes in "nodes" bbject
    for (const [node, functions] of Object.entries(nodes)) {
        // create property option for current node properties
        const functionOption = {
            type: 'dropdown',
            label: 'Function:',
            id: node,
            default: 'select function!',
            choices: [],
            isVisibleData: { node: node },
            isVisible: keyValueLogic
        }

        // loop over all properties of current node
        for (const nodeFunction of functions) {
            // set default function
            if (functionOption.default === 'select function!') functionOption.default = nodeFunction

            // add nodeFunction to "functionOption.choices"
            functionOption.choices.push({ id: nodeFunction, label: nodeFunction.replaceAll('Default//', '').replaceAll('/0', '') })
        }

        // add function option if function has choices
        if (functionOption.choices.length > 0) functionOptions.push(functionOption)
    }

    // return list of all options
    return [ engineSelection(inst), nodeOption ].concat(functionOptions)
}