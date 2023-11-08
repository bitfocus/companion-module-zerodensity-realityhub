// engines

import { getVariables } from '../variables.js'
import { ms2S, isEqual } from '../tools.js'


// creating multidropdown with all available engines
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

// loading data related to connected engines
export const loadEngines = async (inst) => {

    // indicate avtive engine loading
    inst.data.module.updateEnginesData = true

    // update data loading feedback
    inst.checkFeedbacks('basicDataLoading')

    // save start time to calculate elapsed time
    const start = Date.now()

    // create empty "engines" object
    const engines = {}

    // create a variable to track the need for 'setVariableDefinitions()'
    let setDefinitions = false

    // request engines data
    const enginesData = await inst.GET('engines', {}, 'medium')

    // check if request was successfull
    if (enginesData !== null) {

        // loop over each engines
        for (const engine of enginesData) {

            // populate empty engine object with data
            engines[engine.id] = {
                name: engine.name,
                displayName: engine.displayName,
                ip: engine.ip,
                role: engine.role,
                status: engine.status,
                activeProject: (engine.rgraphId !== null),
            }

            // checks if 'setVariableDefinitions()' is nessesary
            if (!Object.keys(inst.data.engines).includes(engine.id)) setDefinitions = true
        }

        // save elapsed time
        inst.data.module.updateEnginesDuration = Date.now()-start

        // checking for a change
        if (!isEqual(inst.data.engines, engines)) {

            // saves new engines data
            inst.data.engines = engines

            // get variable definitions and values
            const [def, val] = getVariables(inst)

            // set variable definitions if nessesary
            if (setDefinitions) inst.setVariableDefinitions(def)

            // set variable values
            inst.updateVariables(val)
        }
        // if no change, only update variable for showing "update duration" for engines
        else inst.updateVariables({ updateEnginesDuration:  `${ms2S(inst.data.module.updateEnginesDuration)}s` })
    }
    // if engines request fails
    else {
        // reset polling duration
        inst.data.module.updateEnginesDuration = 0

        // empty engines object
        inst.data.engines = {}

        // get variable definitions and values
        const [def, val] = getVariables(inst)

        // set variable definitions
        inst.setVariableDefinitions(def)

        // set variable values
        inst.updateVariables(val)
    }

    // indicate inavtive engine loading
    inst.data.module.updateEnginesData = false

    // update data loading feedback
    inst.checkFeedbacks('basicDataLoading')
}