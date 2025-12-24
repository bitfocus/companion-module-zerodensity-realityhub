// rundowns

import { getActions } from '../actions.js'
import { getFeedbacks } from '../feedbacks.js'
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
    
    // request rundowns data with 'medium' priority
    const rundownsData = await inst.GET('playout/rundowns', {}, 'medium')

    // check if request was successfull
    if (rundownsData !== null && Array.isArray(rundownsData)) {
        // set total step count for polling all rundowns
        if (totalSteps === 0) totalSteps = rundownsData.length

        // loop over each rundown
        for (const rundown of rundownsData) {
            // sort out template pool from rundowns (this rundown should only appear in the "templates" feature)
            if (rundown.name === inst.config.templatePool) continue

            // update "rundowns" object with current rundown
            rundowns[rundown.id] = {
                name: rundown.name,
                items: {}
            }

            // request items data of single rundown with 'medium' priority
            const itemsData = await inst.GET(`playout/rundowns/${rundown.id}/items`, {}, 'medium') 

            // loop over each item if request was successfull and response is an array
            if (itemsData !== null && Array.isArray(itemsData)) {
                for (const item of itemsData) {
                    // update "rundowns" object with item properties
                    rundowns[rundown.id].items[item.id] = {
                        name: item.name,
                        buttons: {}
                    }

                    // update button labels
                    for (const button of item.buttons) rundowns[rundown.id].items[item.id].buttons[button.id] = button.label
                }
            }
            else {
                rundowns = {}
                break
            }

            if (Object.keys(rundowns).length === 0) break

            // increasing current step
            currentStep++

            // update progress if current step is lower or equal to total steps
            if (currentStep < totalSteps) {
                inst.data.module.updateRundownsProgress = Math.floor(100*currentStep/totalSteps)
                inst.updateVariables({ updateRundownsProgress: inst.data.module.updateRundownsProgress + '%' })
                if (!inst.moduleInitiated) inst.updateStatus('LOAD: Rundowns data ...', inst.data.module.updateRundownsProgress + '%')
            }
        }
    }

    // when rundowns request fails
    else { rundowns = {} }

    if (inst.enableRequests === false) {
        inst.data.module.updateRundownsData = false
        return
    }

    // only update rundowns if requested data is diffrent from previous rundown data
    if (!isEqual(inst.data.rundowns, rundowns)) {
        inst.data.rundowns = rundowns
        inst.setActionDefinitions(getActions(inst))
        inst.setFeedbackDefinitions(getFeedbacks(inst))
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