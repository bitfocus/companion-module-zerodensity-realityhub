// presets

import { combineRgb } from '@companion-module/base'
import { engineSelection } from './features/engines.js'
import { variablePath } from './tools.js'

export const getPresets = (inst) => {
    const presets = []

    // append basic presets for module features
    presets.push({
        category: 'Basic: Features',
        name: 'Update Engines Data',
        type: 'button',
        style: {
            text: 'ENG:\\n\\n' + variablePath(inst, 'updateEnginesDuration'),
            size: '18',
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(51, 0, 0)
        },
        steps: [
            {
                down: [
                    {
                        actionId: 'basicLoadFeatureData',
                        options: { data: 'updateEnginesData' }
                    }
                ]
            }
        ],
        feedbacks: [
            {
                feedbackId: 'basicFeatureSelected',
                options: { feature: 'engines' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 51)
                }
            },
            {
                feedbackId: 'basicFeatureDataLoading',
                options: { data: 'updateEnginesData' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 255)
                }
            }
        ]
    },
    {
        category: 'Basic: Features',
        name: 'Update Nodes Data',
        type: 'button',
        style: {
            text: 'NOD:\\n' + variablePath(inst, 'updateNodesProgress') + '\\n' + variablePath(inst, 'updateNodesDuration'),
            size: '18',
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(51, 0, 0)
        },
        steps: [
            {
                down: [
                    {
                        actionId: 'basicLoadFeatureData',
                        options: { data: 'updateNodesData' }
                    }
                ]
            }
        ],
        feedbacks: [
            {
                feedbackId: 'basicFeatureSelected',
                options: { feature: 'nodes' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 51)
                }
            },
            {
                feedbackId: 'basicFeatureDataLoading',
                options: { data: 'updateNodesData' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 255)
                }
            }
        ]
    },
    {
        category: 'Basic: Features',
        name: 'Update Rundowns Data',
        type: 'button',
        style: {
            text: 'RUN:\\n' + variablePath(inst, 'updateRundownsProgress') + '\\n' + variablePath(inst, 'updateRundownsDuration'),
            size: '18',
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(51, 0, 0)
        },
        steps: [
            {
                down: [
                    {
                        actionId: 'basicLoadFeatureData',
                        options: { data: 'updateRundownsData' }
                    }
                ]
            }
        ],
        feedbacks: [
            {
                feedbackId: 'basicFeatureSelected',
                options: { feature: 'rundowns' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 51)
                }
            },
            {
                feedbackId: 'basicFeatureDataLoading',
                options: { data: 'updateRundownsData' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 255)
                }
            }
        ]
    },
    {
        category: 'Basic: Features',
        name: 'Update Templates Data',
        type: 'button',
        style: {
            text: 'TEM:\\n' + variablePath(inst, 'updateTemplatesProgress') + '\\n' + variablePath(inst, 'updateTemplatesDuration'),
            size: '18',
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(51, 0, 0)
        },
        steps: [
            {
                down: [
                    {
                        actionId: 'basicLoadFeatureData',
                        options: { data: 'updateTemplatesData' }
                    }
                ]
            }
        ],
        feedbacks: [
            {
                feedbackId: 'basicFeatureSelected',
                options: { feature: 'templates' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 51)
                }
            },
            {
                feedbackId: 'basicFeatureDataLoading',
                options: { data: 'updateTemplatesData' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 255)
                }
            }
        ]
    },
    )

    const engines = engineSelection(inst, true)

    // append basic presets for mixer nodes
    for (let mixer=0; mixer<3; mixer++) {

        for (let channel=1; channel<=10; channel++) {
            presets.push({
                category: `Basic: Mixer_${mixer}`,
                name: `Set preview channel ${channel} on mixer node "Mixer_${mixer}"`,
                type: 'button',
                style: {
                    text: `Ch ${channel}\\nMixer_${mixer}`,
                    size: '18',
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 51, 0)
                },
                steps: [
                    {
                        down: [
                            {
                                actionId: 'basicSetMixerChannel',
                                options: {
                                    engines: engines,
                                    node: `Mixer_${mixer}`,
                                    channel: 'Channels%2F%2FPreviewChannel%2F0',
                                    name: `Channel${channel}`
                                }
                            }
                        ]
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: 'basicMixerChannel',
                        options: {
                            engines: engines,
                            node: `Mixer_${mixer}`,
                            channel: 'Channels//PreviewChannel/0',
                            name: `Channel${channel}`
                        },
                        style: {
                            color: combineRgb(0, 0, 0),
                            bgcolor: combineRgb(0, 255, 0)
                        }
                    },
                    {
                        feedbackId: 'basicMixerChannel',
                        options: {
                            engines: engines,
                            node: `Mixer_${mixer}`,
                            channel: 'Channels//ProgramChannel/0',
                            name: `Channel${channel}`
                        },
                        style: {
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    }
                ]
            })
        }

        presets.push({
            category: `Basic: Mixer_${mixer}`,
            name: `Do transition on mixer node "Mixer_${mixer}"`,
            type: 'button',
            style: {
                text: `Trans\\nMixer_${mixer}`,
                size: '18',
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 255, 0)
            },
            steps: [
                {
                    down: [
                        {
                            actionId: 'basicDoTransition',
                            options: {
                                engines: engines,
                                node: `Mixer_${mixer}`
                            }
                        }
                    ]
                }
            ],
            feedbacks: []
        })
    }

    // append template presets
    if (Object.keys(inst.data.templates).length > 0) {
        const rID = Object.keys(inst.data.templates)[0]
        const templates = inst.data.templates[rID]

        // loop over all items in templatesPool
        for (const [item, itemData] of Object.entries(templates.items)) {

            // loop over all button in template
            for (const [button, buttonLabel] of Object.entries(itemData.buttons)) {

                // if button is valid add preset
                if (buttonLabel !== undefined) presets.push({
                    category: 'Template: ' + itemData.name,
                    name: `Template ${itemData.name} - Button ${buttonLabel}`,
                    type: 'button',
                    style: {
                        text: buttonLabel,
                        size: '18',
                        color: combineRgb(0, 0, 0),
                        bgcolor: combineRgb(255, 255, 0)
                    },
                    steps: [
                        {
                            down: [
                                {
                                    actionId: 'templateButtonPress',
                                    options: { template: `r${rID}_i${item}`, [`r${rID}_i${item}`]:  `r${rID}_i${item}_b${button}` }
                                }
                            ]
                        }
                    ],
                    feedbacks: [
                        {
                            feedbackId: 'templateButtonLabel',
                            options: { template: `r${rID}_i${item}`, [`r${rID}_i${item}`]:  `r${rID}_i${item}_b${button}` },
                            style: {
                                color: combineRgb(255, 255, 255),
                                bgcolor: combineRgb(0, 0, 51)
                            }
                        }
                    ]
                })
            }
        }
    }


    return presets
}