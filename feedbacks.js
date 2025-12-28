// feedbacks

import { combineRgb } from '@companion-module/base'
import { nodePropertiesOptions } from './features/nodes.js'
import { rundownButtonOptions } from './features/rundowns.js'
import { templateButtonOptions } from './features/templates.js'
import { contains, sString, basicFeedback, featureInactive, deepSetProperty } from './tools.js'
import { engineSelection, engineSelectionSingle } from './features/engines.js'



function createFeedbacks(inst) {
    // set default feedbacks
    const feedbacks = {
        basicDisplayConstantDataValue: {
            type: 'advanced',
            name: 'Basic: Display Constant Data Value',
            description: 'Show the value of constant data nodes such as "ConstantBoolean", "ConstantFloat", "ConstantInteger" or "ConstantString" has specified value',
            options: [
                engineSelectionSingle(inst),
                {
                    type: 'dropdown',
                    label: 'Data Type:',
                    id: 'type',
                    default: 'string',
                    choices: [
                        { id: 'float', label: 'ConstantFloat' },
                        { id: 'integer', label: 'ConstantInteger' },
                        { id: 'string', label: 'ConstantString' },
                    ],
                    tooltip: 'Select data type you want to display',
                },
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
            ],
            defaultStyle: {
                color: combineRgb(255, 255, 255),
                bgcolor: combineRgb(0, 0, 255)
            },
            callback: async (event, funcs) => {
                // return if required values empty
                if ([event.options.node].includes('')) return false

                // parse variables from text input
                event.options.node = await funcs.parseVariablesInString(event.options.node)

                switch(event.options.type) {
                    case 'boolean':
                        event.options.property = 'Default//Boolean/0'
                        event.options.value = (event.options.value !== 'true') ? false : true
                        break

                    case 'float':
                        event.options.property = 'Default//Float/0'
                        event.options.value = parseFloat(event.options.value)
                        break

                    case 'integer':
                            event.options.property = 'Default//Integer/0'
                            event.options.value = parseInt(event.options.value)
                            break

                    case 'string':
                        event.options.property = 'Default//String/0'
                        event.options.value = sString(event.options.value)
                        break

                    // return on invalid data type
                    default: return
                }

                if ((inst.data.nodes[event.options.engine] === undefined
                    || inst.data.nodes[event.options.engine][event.options.node] === undefined
                    || inst.data.nodes[event.options.engine][event.options.node].properties[event.options.property] === undefined)
                    && inst.data.module.feedbackRequestActive[`/e:${event.options.engine}/n:${event.options.node}`] !== true) {
                    
                    // request data from server
                    inst.data.module.feedbackRequestActive[`/e:${event.options.engine}/n:${event.options.node}`] = true
                    inst.log('debug', `FeedbackRequestActive: "/e:${event.options.engine}/n:${event.options.node}"`)
                    inst.GET(`engines/${event.options.engine}/nodes/${sString(event.options.node)}/properties`, {}, 'medium').then((response) => {
                        if (!Array.isArray(response)) {
                            inst.data.module.feedbackRequestActive[`/e:${event.options.engine}/n:${event.options.node}`] = false
                            return
                        }

                        for (const property of response) {
                            if (event.options.property === property.PropertyPath) {
                                deepSetProperty(
                                    inst.data.nodes,
                                    [ event.options.engine, event.options.node, 'properties', property.PropertyPath ],
                                    property.Value
                                )
                            }
                        }

                        inst.data.module.feedbackRequestActive[`/e:${event.options.engine}/n:${event.options.node}`] = false

                        // if there was a valid response, check this feedback again to update buttons
                        if (response.length > 0) inst.checkFeedbacks(event.feedbackId) 
                    })
                }

                if (inst.data.nodes[event.options.engine] === undefined) return { text: '' }
                if (inst.data.nodes[event.options.engine][event.options.node] === undefined) return { text: '' }
                if (inst.data.nodes[event.options.engine][event.options.node].properties === undefined) return { text: '' }
                if (inst.data.nodes[event.options.engine][event.options.node].properties[event.options.property] === undefined) return { text: '' }
                return { text: `${inst.data.nodes[event.options.engine][event.options.node].properties[event.options.property]}` }
            }
        },
        basicCheckConstantDataValue: {
            type: 'boolean',
            name: 'Basic: Check Constant Data Value',
            description: 'Show feedback of constant data nodes such as "ConstantBoolean", "ConstantFloat", "ConstantInteger" or "ConstantString" has specified value',
            options: [
                engineSelection(inst),
                {
                    type: 'dropdown',
                    label: 'Data Type:',
                    id: 'type',
                    default: 'boolean',
                    choices: [
                        { id: 'boolean', label: 'ConstantBoolean' },
                        { id: 'booleanVar', label: 'ConstantBoolean (variable)' },
                        { id: 'float', label: 'ConstantFloat' },
                        { id: 'floatVar', label: 'ConstantFloat (variable)' },
                        { id: 'integer', label: 'ConstantInteger' },
                        { id: 'integerVar', label: 'ConstantInteger (variable)' },
                        { id: 'string', label: 'ConstantString' },
                    ],
                    tooltip: 'Select data type you want to check',
                },
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
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
                    type: 'textinput',
                    label: 'Boolean State (variable):',
                    id: 'booleanVar',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter variable for "Boolean" value of specified "ConstantBoolean" node',
                    isVisible: (options) => options.type === 'booleanVar'
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
                    type: 'textinput',
                    label: 'Float Value (variable):',
                    id: 'floatVar',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter variable for "Float" value of specified "ConstantFloat" node',
                    isVisible: (options) => options.type === 'floatVar'
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
                    label: 'Integer Value (variable):',
                    id: 'integerVar',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter variable for "Integer" value of specified "ConstantInteger" node',
                    isVisible: (options) => options.type === 'integerVar'
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
            defaultStyle: {
                color: combineRgb(255, 255, 255),
                bgcolor: combineRgb(0, 0, 255)
            },
            callback: async (event, funcs) => {
                // return if required values empty
                if ([event.options.node].includes('')) return false

                // parse variables from text input
                event.options.node = await funcs.parseVariablesInString(event.options.node)
                event.options.value = await inst.parseVariablesInString(event.options[event.options.type])

                switch(event.options.type) {
                    case 'boolean':
                    case 'booleanVar':
                        event.options.property = 'Default//Boolean/0'
                        event.options.value = (event.options.value !== 'true') ? false : true
                        break

                    case 'float':
                    case 'floatVar':
                        event.options.property = 'Default//Float/0'
                        event.options.value = parseFloat(event.options.value)
                        break

                    case 'integer':
                    case 'integerVar':
                            event.options.property = 'Default//Integer/0'
                            event.options.value = parseInt(event.options.value)
                            break

                    case 'string':
                        event.options.property = 'Default//String/0'
                        event.options.value = sString(event.options.value)
                        break

                    // return on invalid data type
                    default: return
                }

                return basicFeedback(inst, event, {
                    property: event.options.property,
                    value: event.options.value,
                    requestProperties: [ event.options.property ]
                })
            }
        },
        basicFeatureDataLoading: {
            type: 'boolean',
            name: 'Basic: Feature Data Loading',
            description: 'Show when the module loads specific data from RealityHub server',
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
                    tooltip: 'Select data target to get feedback when data will be loaded from RealityHub server'
                }
            ],
            defaultStyle: {
                color: combineRgb(255, 255, 255),
                bgcolor: combineRgb(0, 0, 255)
            },
            callback: (event) => inst.data.module[event.options.data]
        },
        basicFeatureSelected: {
            type: 'boolean',
            name: 'Basic: Feature Selected',
            description: 'Show when a specific is selected in the module configuration',
            options: [
                {
                    type: 'dropdown',
                    label: 'Feature:',
                    id: 'feature',
                    default: 'nodes',
                    choices: [
                        { id: 'engines', label: 'Engines' },
                        { id: 'nodes', label: 'Nodes' },
                        { id: 'rundowns', label: 'Rundowns' },
                        { id: 'templates', label: 'Templates' },
                    ],
                    tooltip: 'Select feature to get feedback when it will be selected during modul configuration'
                }
            ],
            defaultStyle: {
                color: combineRgb(255, 255, 255),
                bgcolor: combineRgb(0, 0, 51)
            },
            callback: (event) =>  event.options.feature === 'engines' || inst.config.features.findIndex((element) => element === event.options.feature) !== -1
        },
        basicMediaFilePath: {
            type: 'boolean',
            name: 'Basic: Media File Path',
            description: 'Set a path to a file on the RealityShare server',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
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
            defaultStyle: {
                color: combineRgb(255, 255, 255),
                bgcolor: combineRgb(0, 0, 255)
            },
            callback: async (event, funcs) => {
                // parse variables from text input
                event.options.node = await funcs.parseVariablesInString(event.options.node)
                event.options.directory = await funcs.parseVariablesInString(event.options.directory)
                event.options.path = await funcs.parseVariablesInString(event.options.path)

                // add backslash to end of directory if not there
                if (!event.options.directory.endsWith('\\')) event.options.directory += '\\'

                // remove backslash from start of file path if there
                if (event.options.path.startsWith('\\')) event.options.path = event.options.path.slice(1)

                return basicFeedback(inst, event, {
                    property: 'File//FilePath/0',
                    value: sString(event.options.directory + event.options.path),
                    requestProperties: [ 'File//FilePath/0' ]
                })
            }
        },
        basicMixerChannel: {
            type: 'boolean',
            name: 'Basic: Mixer Channel',
            description: 'Show if channel is preview of mixer node in selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    default: 'Mixer_0',
                    tooltip: 'Enter name of mixer node. Node names should match across all engines!'
                },
                {
                    type: 'dropdown',
                    label: 'Target:',
                    id: 'channel',
                    default: 'Channels//PreviewChannel/0',
                    choices: [
                        { id: 'Channels//PreviewChannel/0', label: 'Preview'},
                        { id: 'Channels//ProgramChannel/0', label: 'Program'}
                    ],
                    tooltip: 'Select preview or program channel as target for this feedback'
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
                    tooltip: 'Enter name of channel. Channel names should match across all engines!'
                },
            ],
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(0, 255, 0)
            },
            callback: async (event, funcs) => {
                // parse variables from text input
                event.options.node = await funcs.parseVariablesInString(event.options.node)

                return basicFeedback(inst, event, {
                    property: event.options.channel,
                    value: event.options.name,
                    requestProperties: [ 'Channels//ProgramChannel/0', 'Channels//PreviewChannel/0' ]
                })
            }
        },
        nodesCheckPropertyValue: featureInactive(
            'Nodes', 'Node: Check Property Value (INACTIVE!)', 'Show feedback if property hast specified value'
        ),
        rundownButtonLabel: featureInactive(
            'Rundowns', 'Rundown: Button Label (INACTIVE!)', 'Shows the name of selected button'
        ),
        templateButtonLabel: featureInactive(
            'Templates', 'Template: Button Label (INACTIVE!)', 'Shows the name of selected button'
        ),
    }

    // nodes feedbacks
    if (contains(inst.config.features, 'nodes') && Object.keys(inst.data.nodes).length > 0) {
        feedbacks.nodesCheckPropertyValue = {
            type: 'boolean',
            name: 'Nodes: Check Property Value',
            description: 'Show if node property is set to specified values',
            options: nodePropertiesOptions(inst),
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 255, 0)
            },
            callback: async (event, funcs) => {
                // return "false" if no engine selected
                if (event.options.engines.length === 0) return false

                // loop over all selected engines
                for (const engine of event.options.engines) {

                    // check if property path is available
                    if (inst.data.nodes[engine] === undefined) return false
                    if (inst.data.nodes[engine][event.options.node] === undefined) return false
                    if (inst.data.nodes[engine][event.options.node].properties === undefined) return false
                    if (inst.data.nodes[engine][event.options.node].properties[event.options[event.options.node]] === undefined) return false

                    let storedProperty = inst.data.nodes[engine][event.options.node].properties[event.options[event.options.node]]
                    if (typeof storedProperty === 'object') {
                        storedProperty = JSON.stringify(storedProperty)
                    }

                    // create comparison
                    const compareProperty = { normalValue: undefined, safeValue: undefined, normalObject: {}, safeObject: {} }
                    for (const [inputKey, data] of Object.entries(inst.data.module.inputNodeMappings)) {
                        if (data.nodes.includes(event.options.node) && data.properties.includes(event.options[event.options.node])) {
                            const keys = inputKey.split(',')
    
                            if (keys.length === 1 && event.options[inputKey] !== undefined) {
                                event.options[inputKey] = await funcs.parseVariablesInString(event.options[inputKey])
                                if (inputKey === 'number' && event.options[inputKey].toString().includes('.')) {
                                    const decimalLength = parseInt(event.options[inputKey].toString().split('.')[1])
                                    storedProperty = (Math.round(storedProperty*(10*decimalLength))/(10*decimalLength)).toString()
                                }
                                else if (inputKey === 'number') {
                                    storedProperty = (Math.round(storedProperty*10)/10).toString()
                                }
                                else if (inputKey === 'boolean') storedProperty = storedProperty.toString()

                                compareProperty.normalValue = event.options[inputKey]
                                compareProperty.safeValue = sString(event.options[inputKey])
                                // console.log(engine, keys, storedProperty, compareProperty)
                            }
                            else if (keys.length === 2 && event.options[inputKey] !== undefined) {
                                // if (compareProperty[keys[0]] === undefined) compareProperty[keys[0]] = {}
                                // compareProperty[keys[0]][keys[1]] = event.options[inputKey]
                                compareProperty.normalObject[keys[1]] = event.options[inputKey]
                                compareProperty.safeObject[keys[1]] = sString(event.options[inputKey])
                            }
                            else return
                        }
                    }

                    // check if stored property missmatches comparison
                    if (![
                        compareProperty.normalValue,
                        compareProperty.safeValue,
                        JSON.stringify(compareProperty.normalObject),
                        JSON.stringify(compareProperty.safeObject)
                    ].includes(storedProperty)) return false
                }

                return true
            }
        }

        // feedbacks.nodesDisplayPropertyValue = {

        // }
    }

    // rundown feedbacks
    if (contains(inst.config.features, 'rundowns') && Object.keys(inst.data.rundowns).length > 0) {
        feedbacks.rundownButtonLabel = {
            type: 'advanced',
            name: 'Rundown: Button Label',
            description: 'Shows the name of selected button',
            options: rundownButtonOptions(inst.data.rundowns),
            callback: (event) => {
                const parts = event.options[event.options[event.options.rundown]].split('_')
                const rID = parts[0]
                const iID = parts[1]
                const bID = parts.slice(2).join('_')
                let label = ''
                try { label = inst.data.rundowns[rID.substring(1)].items[iID.substring(1)].buttons[bID.substring(1)]}
                catch(error) {}
                return { text: label }
            }
        }
    }

    // template feedbacks
    if (contains(inst.config.features, 'templates') && Object.keys(inst.data.templates).length > 0) {
        feedbacks.templateButtonLabel = {
            type: 'advanced',
            name: 'Template: Button Label',
            description: 'Shows the name of selected button',
            options: templateButtonOptions(inst.data.templates),
            callback: (event) => {
                const parts = event.options[event.options.template].split('_')
                const rID = parts[0]
                const iID = parts[1]
                const bID = parts.slice(2).join('_')
                let label = ''
                try { label = inst.data.templates[rID.substring(1)].items[iID.substring(1)].buttons[bID.substring(1)]}
                catch(error) {}
                return { text: label }
            }
        }
    }

    return feedbacks
}

export const getFeedbacks = createFeedbacks