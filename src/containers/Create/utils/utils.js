import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import TextEditor from '../../../components/Editor/Editor.js';
import { database } from '../../../firebase/firebase.utils';

export function addClause(prevState, nextClauseId, nextVarId){
    //Object.keys(prevState.clauses).length causes issues when deleting clauses and adding new clauses
    //use nextClauseId and iterate on each call in Create.js
    const updatedClauses = {
        ...prevState.clauses,
        [nextClauseId] : {
            id: nextClauseId,
            placeholder: 'Clause',
            editorState: EditorState.createEmpty()
        }
    }
    // console.log("add clause " + nextClauseId)
    let [updatedVars, updatedVarDescs] = addVar(prevState, nextClauseId, nextVarId)
    return [updatedClauses, updatedVars, updatedVarDescs];
}

export function addVar(prevState, clauseId, nextVarId){
    // console.log("add var " + clauseId)
    //Object.keys(prevState.vars).length causes issues -> see addClause for details
    //ids are similar in variables and their corresponding varDescs
    const updatedVars = {
        ...prevState.vars,
        [nextVarId] : {
            placeholder: 'Variable',
            clauseId: clauseId,
            id: nextVarId,
            value: ''
        }
    }
    const updatedVarDescs = {
        ...prevState.varDescs,
        [nextVarId] : {
            placeholder: 'Variable Description',
            clauseId: clauseId,
            varId: nextVarId,
            value: ''
        }
    }
    return [updatedVars, updatedVarDescs]
}

// export function updateEditor(){

// }

export function updateVar(prevState, varId, inputValue){
    //TODO: Not every function needs to pass in the state, only pass in relevant data
    const updatedVar = {
        ...prevState.vars,
        [varId]: {
            ...prevState.vars[varId],
            value: inputValue
        }
    }
    return updatedVar
}

export function updateVarDesc(prevState, varId, inputValue){
    const updatedVarDescs = {
        ...prevState.varDescs,
        [varId]: {
            ...prevState.varDescs[varId],
            value: inputValue
        }
    }
    return updatedVarDescs
}

export function deleteClause(prevState, clauseId){
    let updatedState = prevState;
    delete updatedState.clauses[clauseId]
    //delete variables associated with clauses
    return deleteVariableWithClauseId(updatedState, clauseId)
}

export function deleteVariableWithClauseId(prevState, clauseId){
    let updatedState = prevState
    //item is also the index and is the same index for varDesc
    let updatedStateArray = Object.keys(updatedState.vars).map((item) => {
        if (updatedState.vars[item].clauseId === clauseId) {
            delete updatedState.vars[item]
            delete updatedState.varDescs[item]
        }
        return updatedState
    })
    return updatedStateArray.pop()
}

export function deleteVariableWithVarId(prevState, varId){
    //clauses may have 0 variables
    let updatedState = prevState
    let updatedStateArray = Object.keys(updatedState.vars).map((item) => {
        if (updatedState.vars[item].id === varId){
            delete updatedState.vars[item]
            delete updatedState.varDescs[item]
        }
        return updatedState
    })
    return updatedStateArray.pop()
}

export function getPreview(clauses){
    //TODO: get editor content without using stateToHTML library
    let contentHTML = ''
    Object.values(clauses).forEach((item) => {
        contentHTML += stateToHTML(item.editorState.getCurrentContent())
    })
    let previewTextEditor = <TextEditor 
        html = {contentHTML}
        spellCheck={true}
        readOnly={true}/>
    return previewTextEditor
}

function combineEditorStates(clausesObj){
    let clauseStates = []
    Object.values(clausesObj).forEach((item) => {
        //Compile all editorStates into one block and convert to store in database
        if(typeof(item.editorState) !== 'string'){
            clauseStates.push(JSON.stringify(convertToRaw(item.editorState.getCurrentContent())))
        }
    })
    return clauseStates
}

function editorStateToRaw(clausesObj){
    // console.log(clausesObj)
    Object.values(clausesObj).forEach((item) => {
        //Convert each editorState into raw blocks
        if(typeof(item.editorState) !== 'string'){
            item.editorState = JSON.stringify(convertToRaw(item.editorState.getCurrentContent()))
        }
        // console.log(clauseStates)
    })
    return clausesObj
}

export function rawToEditorState(clausesObj){
    // console.log(clausesObj)
    Object.values(clausesObj).forEach((item) => {
        // console.log(item.editorState)
        if(typeof(item.editorState) === 'string'){
            let placeholder = convertFromRaw(JSON.parse(item.editorState))
            item.editorState = EditorState.createWithContent(placeholder)
        }
    })
    // console.log(clausesObj)
    return clausesObj
}

export function saveTemplateToFirebase(state, userUid, templateUid){
    let rawStates = combineEditorStates(state.clauses)
    let rawClauses = editorStateToRaw(state.clauses)
    // console.log(rawClauses)
    // console.log(rawStates)
    let date = new Date()
    let dateString = date.toUTCString()
    let clauseIdArray = []
    Object.values(state.clauses).forEach((obj) => (clauseIdArray.push(obj.id)))
    let TemplateObject = {title: state.title,
        description: state.description,
        author:state.author,
        clauses: rawClauses,
        rawClauseBlocksArray: rawStates,
        vars: state.vars,
        varDescs: state.varDescs,
        templateUid: templateUid,
        userUid: userUid,
        lastEdited: dateString}
    // console.log(TemplateObject)
    database.ref('templates/' + templateUid).set(
        TemplateObject
    )
    database.ref('users/' + userUid + '/templates/'+ templateUid).update(
        TemplateObject
    )
}