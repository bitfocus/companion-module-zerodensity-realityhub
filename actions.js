// actions

import { nodeFunctionsOptions, nodePropertiesOptions } from './features/nodes.js'
import { rundownButtonOptions } from './features/rundowns.js'
import { templateButtonOptions } from './features/templates.js'
import { sString, contains, deepSetProperty, featureInactive, convertToFunctionId, featureLogic } from './tools.js'
import { engineSelection } from './features/engines.js'



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
                    useVariables: true,
                    required: true,
                    default: 'Mixer_0',
                    tooltip: 'Enter name of mixer node. Node names should match across all engines!'
                }
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)

                // return if required values empty
                if ([event.options.node].includes('')) return

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
                                        inst.checkFeedbacks('basicMixerChannel', 'nodesCheckPropertyValue')
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
        basicLoadFeatureData: {
            name: 'Basic: Load Feature Data',
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
                        inst.pollEngines(inst)
                        break
                    case 'updateNodesData':
                        if (inst.data.module.updateNodesData === true) break
                        else if (contains(inst.config.features, 'nodes')) inst.pollNodes(inst)
                        break
                    case 'updateRundownsData':
                        if (inst.data.module.updateRundownsData === true) break
                        else if (contains(inst.config.features, 'rundowns')) 
                        inst.pollRundowns(inst)
                        break
                    case 'updateTemplatesData':
                        if (inst.data.module.updateTemplatesData === true) break
                        else if (contains(inst.config.features, 'templates')) 
                        inst.pollTemplates(inst)
                        break
                }
            }
        },
        basicSetConstantDataValue: {
            name: 'Basic: Set Constant Data Value',
            description: 'Set the value of constant data nodes such as "ConstantBoolean", "ConstantFloat", "ConstantInteger" and "ConstantString".',
            options: [
                engineSelection(inst),
                {
                    type: 'dropdown',
                    label: 'Data Type:',
                    id: 'type',
                    default: 'boolean',
                    choices: [
                        { id: 'boolean', label: 'ConstantBoolean' },
                        { id: 'float', label: 'ConstantFloat' },
                        { id: 'integer', label: 'ConstantInteger' },
                        { id: 'string', label: 'ConstantString' },
                    ],
                    tooltip: 'Select data type you want to change',
                },
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    required: true,
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'checkbox',
                    label: 'Boolean State:',
                    id: 'boolean',
                    tooltip: 'Enter the "Boolean" value for the specified "ConstantBoolean" node',
                    isVisible: (options) => options.type === 'boolean'
                },
                {
                    type: 'number',
                    label: 'Float Value:',
                    id: 'float',
                    useVariables: true,
                    default: 0,
                    step: 0.01,
                    tooltip: 'Enter the "Float" value for the specified "ConstantFloat" node',
                    isVisible: (options) => options.type === 'float'
                },
                {
                    type: 'number',
                    label: 'Integer Value:',
                    id: 'integer',
                    useVariables: true,
                    default: 0,
                    step: 1,
                    tooltip: 'Enter the "Integer" value for the specified "ConstantInteger" node',
                    isVisible: (options) => options.type === 'integer'
                },
                {
                    type: 'textinput',
                    label: 'String Value:',
                    id: 'string',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter the "String" value for the specified "ConstantString" node',
                    isVisible: (options) => options.type === 'string'
                }
            ],
            callback: async (event) => {
                // return if required values empty
                if ([event.options.node].includes('')) return false

                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)
                event.options.value = await inst.parseVariablesInString(event.options[event.options.type])

                switch(event.options.type) {
                    case 'boolean':
                        event.options.property = 'Default%2F%2FBoolean%2F0'
                        event.options.value = (event.options.value !== 'true') ? false : true
                        break

                    case 'float':
                        event.options.property = 'Default%2F%2FFloat%2F0'
                        event.options.value = parseFloat(event.options.value)
                        break

                    case 'integer':
                            event.options.property = 'Default%2F%2FInteger%2F0'
                            event.options.value = parseInt(event.options.value)
                            break

                    case 'string':
                        event.options.property = 'Default%2F%2FString%2F0'
                        event.options.value = sString(event.options.value)
                        break

                    // return on invalid data type
                    default: return
                }

                // return on invalid value parse
                if (event.options.value === 'NaN') return

                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/${event.options.property}`

                    // request new constant value
                    try {
                        const response = await inst.PATCH(endpoint, { Value:  event.options.value })
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response.PropertyPath], response.Value)
                        inst.checkFeedbacks('basicDisplayConstantDataValue', 'basicCheckConstantDataValue', 'nodesCheckPropertyValue')
                    }
                    catch(error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
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
                    useVariables: true,
                    required: true,
                    default: 'MediaInput_0',
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'textinput',
                    label: 'Directory:',
                    id: 'directory',
                    useVariables: true,
                    default: `\\\\${inst.config.host}\\Reality_Share\\Reality\\Assets\\`,
                    tooltip: 'Enter the root directory of all files (use "backslash" \\ to indicate sub directory)'
                },
                {
                    type: 'textinput',
                    label: 'File Path:',
                    id: 'path',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter the file path (use "backslash" \\ to indicate sub directory)'
                }
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)
                event.options.directory = await inst.parseVariablesInString(event.options.directory)
                event.options.path = await inst.parseVariablesInString(event.options.path)

                // return if required values empty
                if ([event.options.node].includes('')) return

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
                        inst.checkFeedbacks('basicFilePath', 'nodesCheckPropertyValue')
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
                    useVariables: true,
                    required: true,
                    default: 'Mixer_0',
                    tooltip: 'Enter name of mixer node. Node names should match across all engines!'
                },
                {
                    type: 'dropdown',
                    label: 'Target:',
                    id: 'channel',
                    default: 'Channels%2F%2FPreviewChannel%2F0',
                    choices: [
                        { id: 'Channels%2F%2FPreviewChannel%2F0', label: 'Preview'},
                        { id: 'Channels%2F%2FProgramChannel%2F0', label: 'Program'}
                    ],
                    tooltip: 'Select "Preview" or "Program" as target for this action'
                },
                {
                    type: 'dropdown',
                    label: 'Channel:',
                    id: 'name',
                    default: 'Channel1',
                    choices: [
                        { id: 'Channel1', label: 'Channel 1'},
                        { id: 'Channel2', label: 'Channel 2'},
                        { id: 'Channel3', label: 'Channel 3'},
                        { id: 'Channel4', label: 'Channel 4'},
                        { id: 'Channel5', label: 'Channel 5'},
                        { id: 'Channel6', label: 'Channel 6'},
                        { id: 'Channel7', label: 'Channel 7'},
                        { id: 'Channel8', label: 'Channel 8'},
                        { id: 'Channel9', label: 'Channel 9'},
                        { id: 'Channel10', label: 'Channel 10'}
                    ],
                    tooltip: 'Select channel to set to selected target'
                },
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)

                // return if required values empty
                if ([event.options.node].includes('')) return

                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/${event.options.channel}`
                    
                    // request new mixer channel
                    try {
                        const response = await inst.PATCH(endpoint, { Value: event.options.name })

                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response.PropertyPath], response.Value)
                        inst.checkFeedbacks('basicMixerChannel', 'nodesCheckPropertyValue')
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
                    useVariables: true,
                    required: true,
                    default: '',
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'textinput',
                    label: 'Function Name:',
                    id: 'function',
                    useVariables: true,
                    required: true,
                    default: 'Do Transition',
                    tooltip: 'Enter function name. Function names should match across all engines!'
                }
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)
                event.options.function = await inst.parseVariablesInString(event.options.function)

                // return if required values empty
                if ([event.options.node, event.options.function].includes('')) return

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
        basicTriggerMediaFunction: {
            name: 'Basic: Trigger Media Function',
            description: 'Trigger playback functions of specified media node for selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    default: 'MediaInput_0',
                    tooltip: 'Enter name of media node. Node names should match across all engines!'
                },
                {
                    type: 'dropdown',
                    label: 'Function:',
                    id: 'function',
                    default: 'Default%2F%2FPlay%2F0',
                    choices: [
                        { id: 'Default%2F%2FPlay%2F0', label: 'Play'},
                        { id: 'Default%2F%2FPause%2F0', label: 'Pause'},
                        { id: 'Default%2F%2FRewind%2F0', label: 'Rewind'}
                    ],
                    tooltip: 'Select playback function'
                },
                {
                    type: 'checkbox',
                    label: 'Loop Media:',
                    id: 'loop',
                    default: true,
                    tooltip: 'Change between loop playback and single playback'
                }
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)

                // return if required values empty
                if ([event.options.node].includes('')) return

                // loop ovber all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoints
                    const endpoint1 = `engines/${engine}/nodes/${sString(event.options.node)}/functions/${event.options.function}`
                    const endpoint2 = `engines/${engine}/nodes/${sString(event.options.node)}/properties/Media%2F%2FLoop%2F0`

                    try {
                        // trigger playback function
                        const response1 = await inst.POST(endpoint1)

                        // throw error if "success" !== true
                        if (response1.success !== true) throw new Error('ResponseError')

                        // change loop property
                        const response2 = await inst.PATCH(endpoint2, { Value: event.options.loop })

                        // throw error if loop property change was not successful
                        if (response2.PropertyPath !== 'Media//Loop/0' || response2.Value !== event.options.loop) throw new Error('PropertyError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response2.PropertyPath], response2.Value)
                    }
                    catch(error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            },
        },
        nodeSetPropertyValue: featureInactive(
            'Nodes', 'Node: Set Property Value (INACTIVE!)', 'Set any property of specified node for selected engines'
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
        
        actions.nodeSetPropertyValue = {
            name: 'Node: Set Property Value',
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
                                body.Value = sString(await inst.parseVariablesInString(event.options[inputKey]))
                            }
                            else if (bodyKeys.length === 2 && event.options[inputKey] !== undefined) {
                                if (body[bodyKeys[0]] === undefined) body[bodyKeys[0]] = {}
                                body[bodyKeys[0]][bodyKeys[1]] = await inst.parseVariablesInString(event.options[inputKey])
                            }
                            else return
                        }
                    }

                    try {
                        // request new properties
                        const response = await inst.PATCH(endpoint, body)
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        inst.data.nodes[engine][event.options.node].properties[response.PropertyPath] = response.Value
                        inst.checkFeedbacks('nodesCheckPropertyValue', 'basicMixerChannel', 'basicMediaFilePath','basicDisplayConstantDataValue',  'basicCheckConstantDataValue')
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