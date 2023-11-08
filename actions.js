// actions

import { nodeFunctionsOptions, nodePropertiesOptions } from './features/nodes.js'
import { rundownButtonOptions } from './features/rundowns.js'
import { templateButtonOptions } from './features/templates.js'
import { sString, contains, deepSetProperty, featureInactive, convertToFunctionId, featureLogic } from './tools.js'
import { engineSelection } from './engines.js'



function createActions(inst) {
    // set default actions
    const actions = {
        basicDoTransition: {
            name: 'Basic: Do Transition',
            description: 'Trigger "DoTransition" function of specified node for selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    default: 'Mixer_0',
                    tooltip: 'Enter name of mixer node. Node names should match across all engines!'
                }
            ],
            callback: async (event) => {
                // return if no node is specified
                if (event.options.node === '') return

                // loop ovber all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/functions/Default%2F%2FDoTransition%2F0`

                    try {
                        // trigger of "DoTransition"
                        const response = await inst.POST(endpoint)

                        if (response.success === true) {
                            // request property data of selected node to update feedbacks
                            let properties = await inst.GET(`engines/${engine}/nodes/${sString(event.options.node)}/properties`)
                            
                            // loop over all properties in response to find transision duration
                            for (const property of properties) {
                                if (property.PropertyPath.includes('DoTransition/Duration')) {
                                    // set timeout for duration of transition (+3% extra time)
                                    setTimeout(async () => {
                                        // request properties of selected node to update feedbacks
                                        properties = await inst.GET(
                                            `engines/${engine}/nodes/${sString(event.options.node)}/properties`,
                                            {},
                                            'medium'
                                        )
                                        
                                        // loop over all properties in response to find feedback relevant data
                                        for (const property of properties) {
                                            if (property.PropertyPath.includes('ProgramChannel')) {
                                                deepSetProperty(
                                                    inst.data.nodes,
                                                    [ engine, event.options.node, 'properties', property.PropertyPath ],
                                                    property.Value
                                                )
                                            }
                                            else if (property.PropertyPath.includes('PreviewChannel')) {
                                                deepSetProperty(
                                                    inst.data.nodes,
                                                    [ engine, event.options.node, 'properties', property.PropertyPath ],
                                                    property.Value
                                                )
                                            }
                                        }

                                        // check feedbacks to update buttons
                                        inst.checkFeedbacks('basicMixerChannel', 'nodesProperty')
                                    }, property.Value*1030)
                                    break
                                }
                            }
                        }
                        // throw error if "success" !== true
                        else throw new Error('ResponseError')
                    }
                    catch(error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicLoadData: {
            name: 'Basic: Load Data',
            description: 'Load specific data from RealityHub server',
            options: [
                {
                    type: 'dropdown',
                    label: 'Data:',
                    id: 'data',
                    default: 'updateEnginesData',
                    choices: [
                        { id: 'updateEnginesData', label: 'Engines' },
                        { id: 'updateNodesData', label: 'Nodes' },
                        { id: 'updateRundownsData', label: 'Rundowns' },
                        { id: 'updateTemplatesData', label: 'Templates' },
                    ],
                    tooltip: 'Select data target to manually load specific data from RealityHub server'
                },
                {
                    type: 'static-text',
                    id: 'infoNodes',
                    label: 'IMPORTANT: Please select the "Nodes" feature in the module configuration!',
                    isVisibleData: { config: inst.config, feature: 'nodes', id: 'updateNodesData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'instructionNodes',
                    label: '(Connections > Module > Edit connection > Select additional Features > Nodes)',
                    isVisibleData: { config: inst.config, feature: 'nodes', id: 'updateNodesData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'infoRundowns',
                    label: 'IMPORTANT: Please select the "Rundowns" feature in the module configuration!',
                    isVisibleData: { config: inst.config, feature: 'rundowns', id: 'updateRundownsData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'instructionRundowns',
                    label: '(Connections > Module > Edit connection > Select additional Features > Rundowns)',
                    isVisibleData: { config: inst.config, feature: 'rundowns', id: 'updateRundownsData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'infoTemplates',
                    label: 'IMPORTANT: Please select the "Templates" feature in the module configuration!',
                    isVisibleData: { config: inst.config, feature: 'templates', id: 'updateTemplatesData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'instructionTemplates',
                    label: '(Connections > Module > Edit connection > Select additional Features > Templates)',
                    isVisibleData: { config: inst.config, feature: 'templates', id: 'updateTemplatesData' },
                    isVisible: featureLogic
                },
            ],
            callback: async (event) => {
                    
                switch(event.options.data) {
                    case 'updateEnginesData':
                        if (inst.data.module.updateEnginesData === true) break
                        pollEngines()
                        break
                    case 'updateNodesData':
                        if (inst.data.module.updateNodesData === true) break
                        pollNodes()
                        break
                    case 'updateRundownsData':
                        if (inst.data.module.updateRundownsData === true) break
                        pollRundowns()
                        break
                    case 'updateTemplatesData':
                        if (inst.data.module.updateTemplatesData === true) break
                        pollTemplates()
                        break
                }
            }
        },
        basicSetMediaFilePath: {
            name: 'Basic: Set Media File Path',
            description: 'Set a path to a file on the RealityShare server',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    default: 'MediaInput_0',
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'textinput',
                    label: 'Directory:',
                    id: 'directory',
                    default: `\\\\${inst.config.host}\\Reality_Share\\Reality\\Assets\\`,
                    tooltip: 'Enter the root directory of all files (use "backslash" \\ to indicate sub directory)'
                },
                {
                    type: 'textinput',
                    label: 'File Path:',
                    id: 'path',
                    default: '',
                    tooltip: 'Enter the file path (use "backslash" \\ to indicate sub directory)'
                }
            ],
            callback: async (event) => {
                // add backslash to end of directory if not there
                if (!event.options.directory.endsWith('\\')) event.options.directory += '\\'

                // remove backslash from start of file path if there
                if (event.options.path.startsWith('\\')) event.options.path = event.options.path.slice(1)

                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/File%2F%2FFilePath%2F0`

                    // request new file path
                    try {
                        const response = await inst.PATCH(endpoint, { Value:  sString(event.options.directory + event.options.path) })
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response.PropertyPath], response.Value)
                        inst.checkFeedbacks('basicFilePath', 'nodesProperty')
                    }
                    catch(error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicSetMixerChannel: {
            name: 'Basic: Set Mixer Channel',
            description: 'Set preview/programm channel of mixer node for selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    default: 'Mixer_0',
                    tooltip: 'Enter name of mixer node. Node names should match across all engines!'
                },
                {
                    type: 'dropdown',
                    label: 'Channel:',
                    id: 'channel',
                    default: 'Channels%2F%2FPreviewChannel%2F0',
                    choices: [
                        { id: 'Channels%2F%2FPreviewChannel%2F0', label: 'Preview'},
                        { id: 'Channels%2F%2FProgramChannel%2F0', label: 'Program'}
                    ],
                    tooltip: 'Select preview or program channel as target for this action'
                },
                {
                    type: 'textinput',
                    label: 'Channel Name:',
                    id: 'name',
                    default: 'Channel1',
                    tooltip: 'Enter name of channel. Channel names should match across all engines!'
                },
            ],
            callback: async (event) => {
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/${sString(event.options.channel)}`
                    
                    // request new mixer channel
                    try {
                        const response = await inst.PATCH(endpoint, { Value: event.options.name })
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response.PropertyPath], response.Value)
                        inst.checkFeedbacks('basicMixerChannel', 'nodesProperty')
                    }
                    catch(error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicTriggerFunction: {
            name: 'Basic: Trigger Function',
            description: 'Trigger a function on all selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    default: '',
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'textinput',
                    label: 'Function Name:',
                    id: 'function',
                    default: 'Do Transition',
                    tooltip: 'Enter function name. Function names should match across all engines!'
                }
            ],
            callback: async (event) => {
                // convert function name to proper function id
                const functionId = convertToFunctionId(event.options.function)

                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/functions/${sString(functionId)}`

                    // request trigger of function
                    try {
                        const response = await inst.POST(endpoint)
                        if ((response.success !== true)) throw new Error('ResponseError')
                    }
                    catch(error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        nodeSetProperty: featureInactive(
            'Nodes', 'Node: Set Property (INACTIVE!)', 'Set any property of specified node for selected engines'
        ),
        nodeTriggerFunction: featureInactive(
            'Nodes', 'Node: Trigger Function (INACTIVE!)', 'Trigger any function of specified node for selected engines'
        ),
        rundownButtonPress: featureInactive(
            'Rundowns', 'Rundown: Button Press (INACTIVE!)', 'Trigger any button from selected rundowns'
        ),
        templateButtonPress: featureInactive(
            'Templates', 'Template: Button Press (INACTIVE!)', 'Trigger any button from selected template'
        ),
    }

    // set node actions if feature selected
    if (contains(inst.config.features, 'nodes') && Object.keys(inst.data.nodes).length > 0) {
        
        actions.nodeSetProperty = {
            name: 'Node: Set Property',
            description: 'Set any property of specified node for selected engines',
            options: nodePropertiesOptions(inst),
            callback: async (event) => {
                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/${sString(event.options[event.options.node])}`

                    // create body
                    const body = {}
                    for (const [inputKey, data] of Object.entries(inst.data.module.inputNodeMappings)) {
                        if (data.nodes.includes(event.options.node) && data.properties.includes(event.options[event.options.node])) {
                            const bodyKeys = inputKey.split(',')
    
                            if (bodyKeys.length === 1 && event.options[inputKey] !== undefined) {
                                body.Value = sString(event.options[inputKey])
                            }
                            else if (bodyKeys.length === 2 && event.options[inputKey] !== undefined) {
                                if (body[bodyKeys[0]] === undefined) body[bodyKeys[0]] = {}
                                body[bodyKeys[0]][bodyKeys[1]] = event.options[inputKey]
                            }
                            else return
                        }
                    }

                    try {
                        // request new properties
                        const response = await inst.PATCH(endpoint, body)
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        inst.data.nodes[engine][event.options.node].properties[response.PropertyPath] = response.Value
                        inst.checkFeedbacks('nodesProperty', 'basicMixerChannel', 'basicMediaFilePath')
                    }
                    catch(error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        }

        actions.nodeTriggerFunction = {
            name: 'Node: Trigger Function',
            description: 'Trigger any function of specified node for selected engines',
            options: nodeFunctionsOptions(inst),
            callback: async (event) => {
                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/functions/${sString(event.options[event.options.node])}`
                    
                    try {
                        // request function trigger
                        const response = await inst.POST(endpoint)
                        if (response.success !== true) throw new Error('ResponseError')
                    }
                    catch(error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        }
    }

    // set rundown actions if feature selected
    if (contains(inst.config.features, 'rundowns') && Object.keys(inst.data.rundowns).length > 0) {

        actions.rundownButtonPress = {
            name: 'Rundown: Button Press',
            description: 'Trigger any button from selected rundowns',
            options: rundownButtonOptions(inst.data.rundowns),
            callback: async (event) => {
                const [rID, iID, bID] = event.options[event.options[event.options.rundown]].split('_')
                inst.POST(`playout/rundowns/${rID.substring(1)}/items/${iID.substring(1)}/${sString(bID.substring(1))}`)
            }
        }
    }

    // set template actions if feature selected
    if (contains(inst.config.features, 'templates') && Object.keys(inst.data.templates).length > 0) {

        actions.templateButtonPress = {
            name: 'Template: Button Press',
            description: 'Trigger any button from selected template',
            options: templateButtonOptions(inst.data.templates),
            callback: async (event) => {
                const [rID, iID, bID] = event.options[event.options.template].split('_')
                inst.POST(`playout/rundowns/${rID.substring(1)}/items/${iID.substring(1)}/${sString(bID.substring(1))}`)
            }
        }
    }

    return actions
}

export const getActions = createActions