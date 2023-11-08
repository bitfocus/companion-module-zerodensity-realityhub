// feedbacks

import { combineRgb } from '@companion-module/base'
import { nodePropertiesOptions } from './features/nodes.js'
import { rundownButtonOptions } from './features/rundowns.js'
import { templateButtonOptions } from './features/templates.js'
import { contains, sString, basicFeedback, featureInactive } from './tools.js'
import { engineSelection } from './engines.js'



function createFeedbacks(inst) {
    // set default feedbacks
    const feedbacks = {
        basicDataLoading: {
            type: 'boolean',
            name: 'Basic: Data Loading',
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
                        { id: 'templated', label: 'Templates' },
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
            defaultStyle: {
                color: combineRgb(255, 255, 255),
                bgcolor: combineRgb(0, 0, 255)
            },
            callback: async (event) => {
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
                    default: 'Mixer_0',
                    tooltip: 'Enter name of mixer node. Node names should match across all engines!'
                },
                {
                    type: 'dropdown',
                    label: 'Channel:',
                    id: 'channel',
                    default: 'Channels//PreviewChannel/0',
                    choices: [
                        { id: 'Channels//PreviewChannel/0', label: 'Preview'},
                        { id: 'Channels//ProgramChannel/0', label: 'Program'}
                    ],
                    tooltip: 'Select preview or program channel as target for this feedback'
                },
                {
                    type: 'textinput',
                    label: 'Channel Name:',
                    id: 'name',
                    default: 'Channel1',
                    tooltip: 'Enter name of channel. Channel names should match across all engines!'
                },
            ],
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(0, 255, 0)
            },
            callback: (event) => {
                return basicFeedback(inst, event, {
                    property: event.options.channel,
                    value: sString(event.options.name),
                    requestProperties: [ 'Channels//ProgramChannel/0', 'Channels//PreviewChannel/0' ]
                })
            }
        },
        nodesProperty: featureInactive(
            'Nodes', 'Node: Property (INACTIVE!)', 'Show feedback if property hast specified value'
        ),
        rundownButtonLabel: featureInactive(
            'Rundowns', 'Rundown: Button Label (INACTIVE!)', 'Shows the name of selected button'
        ),
        templateButtonLabel: featureInactive(
            'Templates', 'Template: Button Label (INACTIVE!)', 'Shows the name of selected button'
        ),
    }

    // nodes feedbacks
    if (contains(inst.config.features, 'nodes') && Object.keys(inst.data.nodes) > 0) {
        feedbacks.nodesProperty = {
            type: 'boolean',
            name: 'Nodes: Property',
            description: 'Show if node property is set to specified values',
            options: nodePropertiesOptions(inst),
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 255, 0)
            },
            callback: async (event) => {
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
                    if (typeof storedProperty === 'object') storedProperty = JSON.stringify(storedProperty)

                    // create comparison
                    const compareProperty = {}
                    for (const [inputKey, data] of Object.entries(inst.data.module.inputNodeMappings)) {
                        if (data.nodes.includes(event.options.node) && data.properties.includes(event.options[event.options.node])) {
                            const keys = inputKey.split(',')
    
                            if (keys.length === 1 && event.options[inputKey] !== undefined) {
                                compareProperty.normalValue = event.options[inputKey]
                                compareProperty.safeValue = sString(event.options[inputKey])
                            }
                            else if (keys.length === 2 && event.options[inputKey] !== undefined) {
                                if (compareProperty[keys[0]] === undefined) compareProperty[keys[0]] = {}
                                compareProperty[keys[0]][keys[1]] = event.options[inputKey]
                            }
                            else return
                        }
                    }

                    // check if stored property missmatches comparison
                    if (![
                        compareProperty.normalValue,
                        compareProperty.safeValue,
                        JSON.stringify(compareProperty)
                    ].includes(storedProperty)) return false
                }

                return true
            }
        }
    }

    // rundown feedbacks
    if (contains(inst.config.features, 'rundowns') && Object.keys(inst.data.rundowns).length > 0) {
        feedbacks.rundownButtonLabel = {
            type: 'advanced',
            name: 'Rundown: Button Label',
            description: 'Shows the name of selected button',
            options: rundownButtonOptions(inst.data.rundowns),
            callback: (event) => {
                const [rID, iID, bID] = event.options[event.options[event.options.rundown]].split('_')
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
                const [rID, iID, bID] = event.options[event.options.template].split('_')
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