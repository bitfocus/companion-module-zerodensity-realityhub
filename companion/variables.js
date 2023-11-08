// variables

import { ms2S } from './tools.js'



let variables = []
let values = {}



function newVar(id, name, value) {
    variables.push({
        variableId: id,
        name: name
    })
    values[id] = value
}

export const getVariables = (inst) => {

    newVar('connectedEngines', 'Connected Engines', Object.keys(inst.data.engines).length)

    Object.entries(inst.data.engines).forEach(([eID, engine]) => {
        newVar(`engine${eID}_name`, `${engine.displayName} - Name`, engine.name)
        newVar(`engine${eID}_ip`, `${engine.displayName} - IP-Address`, engine.ip)
        newVar(`engine${eID}_role`, `${engine.displayName} - Role`, engine.role)
        newVar(`engine${eID}_status`, `${engine.displayName} - Status`, engine.status)
        newVar(`engine${eID}_launched`, `${engine.displayName} - Launched`, engine.activeProject)
    })

    newVar('updateEnginesDuration', 'Update Engines-Data Duration', `${ms2S(inst.data.module.updateEnginesDuration)}s`)
    newVar('updateNodesDuration', 'Update Nodes-Data Duration', `${ms2S(inst.data.module.updateNodesDuration)}s`)
    newVar('updateNodesProgress', 'Update Nodes-Data Progress', inst.data.module.updateNodesProgress + '%')
    newVar('updateRundownsDuration', 'Update Rundowns-Data Duration', `${ms2S(inst.data.module.updateRundownsDuration)}s`)
    newVar('updateRundownsProgress', 'Update Rundowns-Data Progress', inst.data.module.updateRundownsProgress + '%')
    newVar('updateTemplatesDuration', 'Update Templates-Data Duration', `${ms2S(inst.data.module.updateTemplatesDuration)}s`)
    newVar('updateTemplatesProgress', 'Update Templates-Data Progress', inst.data.module.updateTemplatesProgress + '%')

    return [variables, values]
}
