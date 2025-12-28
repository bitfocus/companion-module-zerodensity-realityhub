// rundowns

import { getActions } from '../actions.js'
import { getFeedbacks } from '../feedbacks.js'
import { getPresets } from '../presets.js'
import { keyValueLogic, ms2S, isEqual } from '../tools.js'



// creates dropdown options for all rundown buttons with visibility logic
export const rundownButtonOptions = (rundowns) => {
    const allowed = [ 'rundown' ]
    const items = []
    const buttons = []

    const rOption = {
        type: 'dropdown',
        label: 'Rundown:',
        id: 'rundown',
        default: undefined,
        choices: []
    }

    for (const [rID, rundown] of Object.entries(rundowns)) {
        const rIDs = `r${rID}`
        if (rOption.default == undefined) rOption.default = rIDs
        rOption.choices.push({ id: rIDs, label: rundown.name })
        allowed.push(rIDs)

        const itemOption = {
            type: 'dropdown',
            label: 'Item:',
            id: rIDs,
            default: undefined,
            choices: [],
            isVisibleData: { rundown: rIDs },
            isVisible: keyValueLogic
        }

        if (rundown.items !== undefined) for (const [iID, item] of Object.entries(rundown.items)) {
            const iIDs = `r${rID}_i${iID}`
            if (itemOption.default == undefined) itemOption.default = iIDs
            itemOption.choices.push({ id: iIDs, label: item.name })
            allowed.push(iIDs)

            const buttonOption = {
                type: 'dropdown',
                label: 'Button:',
                id: iIDs,
                default: undefined,
                choices: [],
                isVisibleData: { rundown: rIDs, [rIDs]: iIDs },
                isVisible: keyValueLogic
            }

            if (item.buttons !== undefined) for (const [bID, name] of Object.entries(item.buttons)) {
                const bIDs = `r${rID}_i${iID}_b${bID}`
                if (buttonOption.default == undefined) buttonOption.default = bIDs
                buttonOption.choices.push({ id: bIDs, label: name })
            }

            buttons.push(buttonOption)
        }

        items.push(itemOption)
    }

    return [ rOption ].concat(items).concat(buttons)
}

// loading data related to rundowns
export const loadRundowns = async (inst) => {

    // indicate avtive rundowns loading
    inst.data.module.updateRundownsData = true

    // update data loading feedback
    inst.checkFeedbacks('basicFeatureDataLoading')

    // save start time to calculate elapsed time
    const start = Date.now()

    // set progress to 0%
    inst.data.module.updateRundownsProgress = 0

    // update "updateTemplatesProgress" variable
    inst.updateVariables({ updateRundownsProgress:  inst.data.module.updateRundownsProgress + '%' })

    // create empty "rundowns" object
    let rundowns = {}

    let totalSteps = 0
    let currentStep = 0
    
    // Check if we have Lino engines
    if (!inst.data.linoEngines || Object.keys(inst.data.linoEngines).length === 0) {
        inst.log('warn', 'Skipping rundown update: No Lino engines available')
        inst.data.module.updateRundownsData = false
        return
    }

    // Get all Lino engine IDs
    const linoEngineIds = Object.keys(inst.data.linoEngines)
    totalSteps = linoEngineIds.length

    // Iterate through each Lino engine to get its rundowns
    for (const linoEngineId of linoEngineIds) {
        // Request rundowns for this specific Lino engine
        const rundownsData = await inst.GET(`lino/rundowns/${linoEngineId}`, {}, 'medium')

        // Check if request was successful
        if (rundownsData !== null && Array.isArray(rundownsData)) {
            // Update total steps to include rundowns
            totalSteps += rundownsData.length

            // Loop over each rundown for this engine
            for (const rundown of rundownsData) {
                // Use composite key to handle same rundown ID on different engines
                const rundownKey = rundown.id
                
                // Update "rundowns" object with current rundown
                rundowns[rundownKey] = {
                    name: rundown.name,
                    linoEngineId: linoEngineId, // Store which Lino engine owns this rundown
                    items: {}
                }

                // Request items data using the correct Lino engine ID
                const itemsData = await inst.GET(`lino/rundown/${linoEngineId}/${rundown.id}/items/`, {}, 'medium') 

                // Loop over each item if request was successful
                if (itemsData !== null && Array.isArray(itemsData)) {
                    for (const item of itemsData) {
                        const itemId = item.id
                        
                        rundowns[rundownKey].items[itemId] = {
                            name: item.name,
                            buttons: {}
                        }

                        // Update button labels
                        if (item.buttons) {
                            for (const [key, label] of Object.entries(item.buttons)) {
                                rundowns[rundownKey].items[itemId].buttons[key] = label || key
                            }
                        }
                    }
                }
                else {
                    inst.log('debug', `No items found for rundown "${rundown.name}" (ID: ${rundown.id}) on Lino engine ${linoEngineId}`)
                }

                // Update progress
                currentStep++
                if (currentStep < totalSteps) {
                    inst.data.module.updateRundownsProgress = Math.floor(100*currentStep/totalSteps)
                    inst.updateVariables({ updateRundownsProgress: inst.data.module.updateRundownsProgress + '%' })
                    if (!inst.moduleInitiated) inst.updateStatus('LOAD: Rundowns data ...', inst.data.module.updateRundownsProgress + '%')
                }
            }
        }

        // Update progress for engine
        currentStep++
        if (currentStep < totalSteps) {
            inst.data.module.updateRundownsProgress = Math.floor(100*currentStep/totalSteps)
            inst.updateVariables({ updateRundownsProgress: inst.data.module.updateRundownsProgress + '%' })
        }
    }

    if (inst.enableRequests === false) {
        inst.data.module.updateRundownsData = false
        return
    }

    // only update rundowns if requested data is diffrent from previous rundown data
    if (!isEqual(inst.data.rundowns, rundowns)) {
        inst.data.rundowns = rundowns
        inst.log('info', `Updating definitions with ${Object.keys(rundowns).length} rundowns`)
        inst.setActionDefinitions(getActions(inst))
        inst.setFeedbackDefinitions(getFeedbacks(inst))
        inst.setPresetDefinitions(getPresets(inst))
        inst.checkFeedbacks('rundownButtonLabel')
    }
    
    // set progress to 100%
    inst.data.module.updateRundownsProgress = 100

    // save elapsed time
    inst.data.module.updateRundownsDuration = Date.now()-start

    // update variables
    inst.updateVariables({
        updateRundownsProgress: inst.data.module.updateRundownsProgress + '%',
        updateRundownsDuration: `${ms2S(inst.data.module.updateRundownsDuration)}s`,
    })

    // indicate inavtive rundowns loading
    inst.data.module.updateRundownsData = false

    // update "basicDataLoading" feedback
    inst.checkFeedbacks('basicFeatureDataLoading')
}