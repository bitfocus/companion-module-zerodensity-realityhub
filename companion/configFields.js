// config fields

import { Regex } from '@companion-module/base'



export const createConfigFields = [
    {
        type: 'static-text',
        id: 'info',
        width: 12,
        label: 'Information',
        value: 'This module will connect to a Zerodensity RealityHub 1.3 server',
    },
    {
        type: 'textinput',
        id: 'host',
        label: 'IP Address:',
        width: 6,
        default: '',
        regex: Regex.IP,
        tooltip: 'Enter ip address of reality hub server'
    },
    {
        type: 'multidropdown',
        id: 'features',
        label: 'Select additional Features:',
        default: [],
        choices: [
            { id: 'nodes', label: 'Nodes' },
            { id: 'rundowns', label: 'Rundowns' },
            { id: 'templates', label: 'Templates' },
        ],
        tooltip: 'Select available features. More features, especially the "Nodes" feature, can be resource intensive but will add more functionality'
    },
    {
        type: 'static-text',
        id: 'info',
        width: 12,
        label: 'IMPORTANT:',
        value: 'Selecting the "Nodes" feature can increase startup time by a couple of minutes. Please wait!',
        // isVisible: (options) => Array.isArray(options.features) && options.features.includes('nodes')
    },
    {
        type: 'checkbox',
        id: 'nodes0',
        width: 4,
        label: 'Auto-Update Nodes:',
        default: false,
        tooltip: 'If enabled, the module will update all nodes automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 0 && options.features[0] === 'nodes'
    },
    {
        type: 'checkbox',
        id: 'rundowns0',
        width: 4,
        label: 'Auto-Update Rundowns:',
        default: false,
        tooltip: 'If enabled, the module will update all rundowns automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 0 && options.features[0] === 'rundowns'
    },
    {
        type: 'checkbox',
        id: 'templates0',
        width: 4,
        label: 'Auto-Update Templates:',
        default: false,
        tooltip: 'If enabled, the module will update all templates automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 0 && options.features[0] === 'templates'
    },
    {
        type: 'checkbox',
        id: 'nodes1',
        width: 4,
        label: 'Auto-Update Nodes:',
        default: false,
        tooltip: 'If enabled, the module will update all nodes automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 1 && options.features[1] === 'nodes'
    },
    {
        type: 'checkbox',
        id: 'rundowns1',
        width: 4,
        label: 'Auto-Update Rundowns:',
        default: false,
        tooltip: 'If enabled, the module will update all rundowns automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 1 && options.features[1] === 'rundowns'
    },
    {
        type: 'checkbox',
        id: 'templates1',
        width: 4,
        label: 'Auto-Update Templates:',
        default: false,
        tooltip: 'If enabled, the module will update all templates automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 1 && options.features[1] === 'templates'
    },
    {
        type: 'checkbox',
        id: 'nodes2',
        width: 4,
        label: 'Auto-Update Nodes:',
        default: false,
        tooltip: 'If enabled, the module will update all nodes automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 2 && options.features[2] === 'nodes'
    },
    {
        type: 'checkbox',
        id: 'rundowns2',
        width: 4,
        label: 'Auto-Update Rundowns:',
        default: false,
        tooltip: 'If enabled, the module will update all rundowns automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 2 && options.features[2] === 'rundowns'
    },
    {
        type: 'checkbox',
        id: 'templates2',
        width: 4,
        label: 'Auto-Update Templates:',
        default: false,
        tooltip: 'If enabled, the module will update all templates automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 2 && options.features[2] === 'templates'
    },
    {
        type: 'dropdown',
        id: 'interval',
        label: 'Auto-Update Interval:',
        width: 12,
        default: 'short',
        tooltip: 'Sets the interval for updating features automatically. Shorter intervals can impact performance!',
        choices: [
            { id: 1, label: 'Short Interval (as often as possible)' },
            { id: 10, label: 'Medium Interval' },
            { id: 60, label: 'Long Interval (every couple of minutes)' },
        ],
        isVisible: (options) => {
            let buttons = false
            if (options.nodes0 || options.nodes1 || options.nodes2 || options.rundowns0 || options.rundowns1 || options.rundowns2 || options.templates0 || options.templates1 || options.templates2) {
                buttons = true
            }
            return Array.isArray(options.features) && options.features.length > 0 && buttons
        }
    },
    {
        type: 'textinput',
        id: 'templatePool',
        label: 'Rundown-Name For Templates:',
        width: 6,
        default: 'CompanionTemplatesPool',
        tooltip: 'Enter a name for the rundown, where templates are stored to press buttons from',
        isVisible: (options) => Array.isArray(options.features) && options.features.includes('templates')
    }
]