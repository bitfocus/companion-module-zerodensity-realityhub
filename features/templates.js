//templates

import { getActions } from '../actions.js'
import { getFeedbacks } from '../feedbacks.js'
import { getPresets } from '../presets.js'
import { keyValueLogic, ms2S, isEqual } from '../tools.js'



// creates dropdown options for all rundown buttons with visibility logic
export const templateButtonOptions = (templates) => {
    const rID = Object.keys(templates)[0]
    const rundown = templates[rID]

    const buttons = []

    const tOption = {
        type: 'dropdown',
        label: 'Template:',
        id: 'template',
        default: undefined,
        choices: []
    }

    if (rundown.items !== undefined) for (const [iID, item] of Object.entries(rundown.items)) {
        const iIDs = `r${rID}_i${iID}`
        if (tOption.default == undefined) tOption.default = iIDs
        tOption.choices.push({ id: iIDs, label: item.name })

        if (item.buttons !== undefined && Object.keys(item.buttons).length > 0) {

            const buttonOption = {
                type: 'dropdown',
                label: 'Button:',
                id: iIDs,
                default: undefined,
                choices: [],
                isVisibleData: { template: iIDs },
                isVisible: keyValueLogic
            }

            for (const [bID, name] of Object.entries(item.buttons)) {
                const bIDs = `r${rID}_i${iID}_b${bID}`
                if (buttonOption.default == undefined) buttonOption.default = bIDs
                buttonOption.choices.push({ id: bIDs, label: name })
            }

            buttons.push(buttonOption)
        }
        else {
            buttons.push({
                type: 'static-text',
                id: iIDs + '_noButtons',
                label: 'No buttons in template found!',
                isVisibleData: { template: iIDs },
                isVisible: (options, data) => options[options.template] === undefined && options.template === data.template
            })
        }
    }

    return [ tOption ].concat(buttons)
}

// load data related to templates
export const loadTemplates = async (inst) => {

    // indicate avtive templates loading
    inst.data.module.updateTemplatesData = true

    // update "basicDataLoading" feedback
    inst.checkFeedbacks('basicFeatureDataLoading')

    // save start time to calculate elapsed time
    const start = Date.now()

    // set progress to 0%
    inst.data.module.updateTemplatesProgress = 0

    // update "updateTemplatesProgress" variable
    inst.updateVariables({ updateTemplatesProgress:  inst.data.module.updateTemplatesProgress + '%' })

    let templates = {}
    let templatePool = {}

    let totalSteps = 0
    let currentStep = 0

    // set "templatesAdded" to "false" to track if no templates are added later
    let templatesAdded = false

    // request templates data with 'medium' priority
    const templatesData = await inst.GET('playout/templates', {}, 'medium')

    // check if templates request was successfull and response has at least 1 template
    if (templatesData !== null && Array.isArray(templatesData) && templatesData.length > 0) {

        // set total steps for real time progress
        totalSteps = templatesData.length + 2

        // request rundowns data with 'medium' priority
        const rundownsData = await inst.GET('playout/rundowns', {}, 'medium')
            
        // check if request was successfull
        if (rundownsData !== null && Array.isArray(rundownsData)) {
            // loop over all rundowns
            for (const rundown of rundownsData) {
                // update templatePool object if templatePool found in rundowns
                if (rundown.name === inst.config.templatePool) templatePool = rundown
            }
        }
        else templates = {}

        // increase current step
        currentStep++

        // update progress data
        inst.data.module.updateTemplatesProgress = Math.floor(100*currentStep/totalSteps)
        inst.updateVariables({ updateTemplatesProgress: inst.data.module.updateTemplatesProgress + '%' })
        if (!inst.moduleInitiated) inst.updateStatus('LOAD: Templates data ...', inst.data.module.updateTemplatesProgress + '%')

        // when no templatePool found in rundowns
        if (templatePool.id === undefined) {
            // create new empty rundown
            const newRundown = await inst.POST('playout/rundowns', { name: inst.config.templatePool }, 'medium')

            // update templatePool object with new rundown if request was successfull
            if (newRundown !== null && newRundown.id !== undefined && newRundown.name !== undefined) {
                templatePool = newRundown
                inst.log('debug', `New rundown "${newRundown.name}" created as templatePool!`)
            }
        }

        // when templatePool found in rundowns
        else {
            // request items of templatePool rundown
            const templatePoolItemsData = await inst.GET(`playout/rundowns/${templatePool.id}/items`, {}, 'medium')

            // check if request was successfull
            if (templatePoolItemsData !== null && Array.isArray(templatePoolItemsData)) {

                // create "items" parameter in templatePool object
                templatePool.items = {}

                // update "templates" object with current templatePool rundown
                templates[templatePool.id] = {
                    name: templatePool.name,
                    items: {}
                }

                // loop over all items
                for (const item of templatePoolItemsData) {

                    // update item
                    const itemUpdate = await inst.PATCH(`playout/rundowns/${templatePool.id}/items/${item.id}`, {}, 'medium')

                    if (itemUpdate === null || itemUpdate.id === undefined || itemUpdate.name === undefined) break
                    
                    // update "templates" object with item properties
                    templates[templatePool.id].items[item.id] = {
                        name: item.name,
                        template: item.template,
                        buttons: {}
                    }

                    // update button labels
                    for (const button of item.buttons) templates[templatePool.id].items[item.id].buttons[button.id] = button.label

                    // increase current step
                    currentStep++

                    // update progress if current step is below total steps
                    if (currentStep < totalSteps) {
                        inst.data.module.updateTemplatesProgress = Math.floor(100*currentStep/totalSteps)
                        inst.updateVariables({ updateTemplatesProgress: inst.data.module.updateTemplatesProgress + '%' })
                        if (!inst.moduleInitiated) inst.updateStatus('LOAD: Templates data ...', inst.data.module.updateTemplatesProgress + '%')
                    }
                }
            }
        }

        // increase current step
        currentStep++

        // update progress data
        inst.data.module.updateTemplatesProgress = Math.floor(100*currentStep/totalSteps)
        inst.updateVariables({ updateTemplatesProgress: inst.data.module.updateTemplatesProgress + '%' })
        if (!inst.moduleInitiated) inst.updateStatus('LOAD: Templates data ...', inst.data.module.updateTemplatesProgress + '%')

        // loop over each template of "templatesData"
        for (const template of templatesData) {
            // set "addTemplate" to "true" by default
            let addTemplate = true

            // loop over all templates in templatesPool and set "addTemplate" to "false" if template is already in templatePool
            if (templates[templatePool.id] !== undefined) for (const item of Object.values(templates[templatePool.id].items)) {
                if (template.name === item.name) {
                    addTemplate = false
                    break
                }
            }

            // if "addTemplate" is "true" (template not in templatePool)
            if (addTemplate === true) {
                // set "templatesAdded" to "true" to track that templates have been added
                templatesAdded = true

                // add template as new item to templatePool rundown
                const response = await inst.POST(`playout/rundowns/${templatePool.id}/items`, { template: template.name, name: template.name }, 'medium')
                if (response !== null && response.name !== undefined) {
                    inst.log('debug', `Template "${response.name}" was added to templatePool!`)
                }
                else break
            }

            // increase current step
            currentStep++

            // update progress if current step is below total steps
            if (currentStep < totalSteps) {
                inst.data.module.updateTemplatesProgress = Math.floor(100*currentStep/totalSteps)
                inst.updateVariables({ updateTemplatesProgress: inst.data.module.updateTemplatesProgress + '%' })
                if (!inst.moduleInitiated) inst.updateStatus('LOAD: Templates data ...', inst.data.module.updateTemplatesProgress + '%')
            }
        }

        // in case templates where added to templatesPool
        if (templatesAdded) {
            templates = {}
            
            // request templatesPool
            const poolData = await inst.GET(`playout/rundowns/${templatePool.id}/items`, {}, 'medium')
            if (poolData !== null && Array.isArray(poolData)) {
                // update "templates" object with current templatePool rundown
                templates[templatePool.id] = {
                    name: templatePool.name,
                    items: {}
                }

                // loop over all items
                for (const pool of poolData) {
                    // update "templates" object with item properties
                    templates[templatePool.id].items[pool.id] = {
                        name: pool.name,
                        template: pool.template,
                        buttons: {}
                    }

                    // update button labels
                    for (const button of pool.buttons) { templates[templatePool.id].items[pool.id].buttons[button.id] = button.label }
                }
            }
            else { templates = {} }
        }
    }

    // when no templates available
    else { templates = {} }

    if (inst.enableRequests === false) {
        inst.data.module.updateTemplatesData = false
        return
    }

    // only update templates if requested data is diffrent from previous template data
    if (!isEqual(inst.data.templates, templates)) {
        inst.data.templates = templates
        inst.setActionDefinitions(getActions(inst))
        inst.setFeedbackDefinitions(getFeedbacks(inst))
        inst.checkFeedbacks('templateButtonLabel')
		inst.setPresetDefinitions(getPresets(inst))
    }

    // set progress to 100%
    inst.data.module.updateTemplatesProgress = 100

    // save elapsed time
    inst.data.module.updateTemplatesDuration = Date.now()-start

    // update variables
    inst.updateVariables({
        updateTemplatesProgress:  inst.data.module.updateTemplatesProgress + '%',
        updateTemplatesDuration: `${ms2S(inst.data.module.updateTemplatesDuration)}s`,
    })

    // indicate inavtive templates loading
    inst.data.module.updateTemplatesData = false

    // update "basicDataLoading" feedback
    inst.checkFeedbacks('basicFeatureDataLoading')
}