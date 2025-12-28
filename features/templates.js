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

    // check if legacy template pool sync is enabled
    // Skip if templatePool is empty, "*", or not defined
    if (!inst.config.templatePool || inst.config.templatePool.trim() === '' || inst.config.templatePool.trim() === '*') {
        inst.data.module.updateTemplatesData = false
        inst.data.templates = {}
        return
    }

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

    // Check if we have Lino engines
    if (!inst.data.linoEngines || Object.keys(inst.data.linoEngines).length === 0) {
        inst.log('warn', 'Skipping templates update: No Lino engines available')
        inst.data.module.updateTemplatesData = false
        return
    }

    // request templates data with 'medium' priority
    const templatesData = await inst.GET('lino/templates', {}, 'medium')

    // check if templates request was successfull and response has at least 1 template
    if (templatesData !== null && Array.isArray(templatesData) && templatesData.length > 0) {

        // set total steps for real time progress
        totalSteps = templatesData.length + 2

        // Search for template pool rundown across all Lino engines
        let foundLinoEngineId = null
        const linoEngineIds = Object.keys(inst.data.linoEngines)
        
        for (const linoEngineId of linoEngineIds) {
            const rundownsData = await inst.GET(`lino/rundowns/${linoEngineId}`, {}, 'medium')
            if (rundownsData !== null && Array.isArray(rundownsData)) {
                for (const rundown of rundownsData) {
                    if (rundown.name === inst.config.templatePool) {
                        templatePool = rundown
                        foundLinoEngineId = linoEngineId
                        break
                    }
                }
            }
            if (foundLinoEngineId) break
        }

        // increase current step
        currentStep++

        // update progress data
        inst.data.module.updateTemplatesProgress = Math.floor(100*currentStep/totalSteps)
        inst.updateVariables({ updateTemplatesProgress: inst.data.module.updateTemplatesProgress + '%' })
        if (!inst.moduleInitiated) inst.updateStatus('LOAD: Templates data ...', inst.data.module.updateTemplatesProgress + '%')

        // when no templatePool found in rundowns
        if (templatePool.id === undefined || !foundLinoEngineId) {
            // Lino API typically doesn't support creating rundowns via REST easily or logic is different.
            // We'll skip auto-creation to avoid errors, or user must create it manually.
            inst.log('info', `Rundown "${inst.config.templatePool}" not found. Skipping Template Pool sync.`)
        }

        // when templatePool found in rundowns
        else {
            // Store the Lino engine ID with template pool info
            templatePool.linoEngineId = foundLinoEngineId
            
            // request items of templatePool rundown using correct Lino engine ID
            const templatePoolItemsData = await inst.GET(`lino/rundown/${foundLinoEngineId}/${templatePool.id}/items/`, {}, 'medium')

            // check if request was successfull
            if (templatePoolItemsData !== null && Array.isArray(templatePoolItemsData)) {

                // create "items" parameter in templatePool object
                templatePool.items = {}

                // update "templates" object with current templatePool rundown
                templates[templatePool.id] = {
                    name: templatePool.name,
                    linoEngineId: foundLinoEngineId,
                    items: {}
                }

                // loop over all items
                for (const item of templatePoolItemsData) {

                    // update item - Lino might not need PATCH update to refresh data if GET returns it
                    // skipping PATCH for now as it was likely a trigger to refresh legacy data
                    
                    // update "templates" object with item properties
                    const itemId = item.id
                    templates[templatePool.id].items[itemId] = {
                        name: item.name,
                        template: item.template,
                        buttons: {}
                    }

                    // update button labels
                    if (item.buttons) {
                        for (const [key, label] of Object.entries(item.buttons)) {
                            templates[templatePool.id].items[itemId].buttons[key] = label || key
                        }
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
            if (addTemplate === true && templatePool.id !== undefined && foundLinoEngineId) {
                // set "templatesAdded" to "true" to track that templates have been added
                templatesAdded = true

                // add template as new item to templatePool rundown
                // Lino: POST /api/rest/v1/lino/rundown/{engineId}/{rundownId}/items/
                const response = await inst.POST(`lino/rundown/${foundLinoEngineId}/${templatePool.id}/items/`, { template: template.name, name: template.name }, 'medium')
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
        if (templatesAdded && templatePool.id !== undefined && foundLinoEngineId) {
            templates = {}
            
            // request templatesPool using correct Lino engine ID
            const poolData = await inst.GET(`lino/rundown/${foundLinoEngineId}/${templatePool.id}/items/`, {}, 'medium')
            if (poolData !== null && Array.isArray(poolData)) {
                // update "templates" object with current templatePool rundown
                templates[templatePool.id] = {
                    name: templatePool.name,
                    linoEngineId: foundLinoEngineId,
                    items: {}
                }

                // loop over all items
                for (const pool of poolData) {
                    const poolId = pool.id
                    // update "templates" object with item properties
                    templates[templatePool.id].items[poolId] = {
                        name: pool.name,
                        template: pool.template,
                        buttons: {}
                    }

                    // update button labels
                    if (pool.buttons) {
                        for (const [key, label] of Object.entries(pool.buttons)) {
                            templates[templatePool.id].items[poolId].buttons[key] = label || key
                        }
                    }
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