import React, {Component} from 'react';
import {v4 as uuidv4} from 'uuid';
import {
    addClause,
    addVar,
    updateVar,
    updateVarDesc,
    deleteClause,
    deleteVariableWithVarId,
    rawToEditorState,
    getPreview,
    saveTemplateToFirebase
} from '../Create/utils/utils';
import '../Create/Create.css';
import './Edit.css';
import Modal from '../../components/Modal/Modal';
import Button from '@material-ui/core/Button';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import TextField from '@material-ui/core/TextField';
import Clause from '../../components/Clause/Clause';

class Edit extends Component {
    constructor(props) {
        super(props)
        this.saved = true
        this.templateUid = this.props.location.state.data.templateUid
        this.state = {
            title: this.props.location.state.data.title,
            author: this.props.location.state.data.author,
            description: this.props.location.state.data.description,
            clauses: rawToEditorState(this.props.location.state.data.clauses),
            vars: this.props.location.state.data.vars,
            varDescs: this.props.location.state.data.varDescs,
            openSnackbar: false
        }
        this.nextVarId = parseInt(Object.keys(this.state.vars)[
            Object
                .keys(this.state.vars)
                .length - 1
        ]) + 1
        this.nextClauseId = parseInt(Object.keys(this.state.clauses)[
            Object
                .keys(this.state.clauses)
                .length - 1
        ]) + 1
    }

    updateEditor = (newEditorState, clauseId) => {
        this.setState(prevState => ({
            ...prevState,
            clauses: {
                ...prevState.clauses,
                [clauseId]: {
                    ...prevState.clauses[clauseId],
                    editorState: newEditorState
                }
            }
        }))
    }

    handleUpdateVar = (varId, event) => {
        this.setState({
            vars: updateVar(this.state, varId, event.target.value)
        })
    }

    handleUpdateVarDesc = (varId, event) => {
        //varId is the same for variables and their descriptions
        this.setState({
            varDescs: updateVarDesc(this.state, varId, event.target.value)
        })
    }

    handleAddClause = () => {
        let [updatedClauses,
            updatedVars,
            updatedVarDescs] = addClause(this.state, this.nextClauseId, this.nextVarId)
        //iterate clause and variable id for next added clause
        this.nextClauseId += 1
        this.nextVarId += 1
        this.setState({clauses: updatedClauses, vars: updatedVars, varDescs: updatedVarDescs})
    }

    handleAddVar = (event) => {
        // material ui button data attributes are sent to their root component
        // (parentElement)
        let clauseId = Math.floor(event.target.parentElement.dataset.clause || event.target.dataset.clause)
        let [updatedVars,
            updatedVarDescs] = addVar(this.state, clauseId, this.nextVarId)
        //iterate variable id for next added variable
        this.nextVarId += 1
        this.setState({vars: updatedVars, varDescs: updatedVarDescs})
    }

    handleDeleteClause = async(event) => {
        // User may click either the Material ui iconButton or the svg or the path We
        // assume the base case is the svg, then check for button or path tagnames
        let clauseId = Math.floor(event.target.dataset.clause)
        if (event.target.tagName === "BUTTON") {
            clauseId = Math.floor(event.target.firstChild.firstChild.dataset.clause)
        } else if (event.target.tagName === "path") {
            clauseId = Math.floor(event.target.farthestViewportElement.dataset.clause)
        }
        let updatedState = await deleteClause(this.state, clauseId)
        this.setState({clauses: updatedState.clauses, vars: updatedState.vars, varDescs: updatedState.varDesc})
        // If there is only one clause at time of deletion, delete it and add another clause
        if (Object.keys(updatedState.clauses).length === 0) {
            return this.handleAddClause()
        }
    }

    handleDeleteVar = async(event) => {
        // User may click either the Material ui iconButton or the svg or the path We
        // assume the base case is the svg, then check for button or path tagnames
        // Material ui iconButtons return their icon's root component (see handleAddVar)
        let varId = Math.floor(event.target.dataset.var)
        if (event.target.tagName === "BUTTON") {
            varId = Math.floor(event.target.firstChild.firstChild.dataset.var)
        } else if (event.target.tagName === "path") {
            varId = Math.floor(event.target.farthestViewportElement.dataset.var)
        }
        let updatedState = await deleteVariableWithVarId(this.state, varId)
        this.setState({vars: updatedState.vars, varDescs: updatedState.varDescs})
    }

    handleGetPreview = () => {
        let previewTextEditor = getPreview(this.state.clauses)
        return previewTextEditor
    }

    handleSaveTemplate = async() => {
        if (!this.saved) {
            let templateUid = uuidv4()
            this.templateUid = templateUid
        }
        let copyState = this.state
        await saveTemplateToFirebase(copyState, this.props.match.params.uid, this.templateUid)
        this.saved = true
        this.setState({openSnackbar: true})
    }

    handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
          return;
        }
    
        this.setState({openSnackbar: false})
      };

    render() {
        const clauseArray = [];
        for (let key in this.state.clauses) {
            clauseArray.push({id: this.state.clauses[key].id});
        }
        let varArray = []
        for (let key in this.state.vars) {
            varArray.push({id: key, clauseId: this.state.vars[key].clauseId, value: this.state.vars[key].value, descValue: this.state.varDescs[key].value})
        }
        return (
            <div className="create-holder">
                <div className="header-border">
					<div className="header-info-grid">
						<h2 className="title-label">Template Title:</h2>
						<h4 className="description-label">Template Description:</h4>
						<TextField
							id="title-textfield"
							className="title-input"
							placeholder="Title"
							value={this.state.title}
							onChange=
							{(event) => this.setState({title: event.target.value})}/>
						<TextField
							id="description-textfield"
							placeholder="Title"
							className="description-input"
							value={this.state.description}
							onChange=
							{(event) => this.setState({description: event.target.value})}/>
                    </div>
                </div>
                {clauseArray.map(clauseItem => (
					<Clause
						key={`clause_${clauseItem.id}`}
						clauseId={clauseItem.id}
						clauseArrayLength={clauseArray.length}
						varArray={varArray}
						updateEditor={this.updateEditor}
						initialEditorState={this.state.clauses[clauseItem.id].editorState}
						addClause={this.handleAddClause}
						addVar={this.handleAddVar}
						deleteClause={this.handleDeleteClause}
						deleteVar={this.handleDeleteVar}
						updateVar={this.handleUpdateVar}
						updateVarDesc={this.handleUpdateVarDesc}/>))}
                <Snackbar 
                    open={this.state.openSnackbar} 
                    autoHideDuration={3000} 
                    onClose={this.handleCloseSnackbar} 
                    anchorOrigin={{ vertical:'bottom', horizontal:'left' }}>
                    <MuiAlert 
                        elevation={6} 
                        onClose={this.handleCloseSnackbar} 
                        severity="success"
                        variant="filled">
                        Template Saved!
                    </MuiAlert>
                </Snackbar>
                <div className="exit-options">
                    <div className="exit-buttons exit-buttons-grid">
                        <div className="left-buttons">
                            <Modal 
                                type="create-preview" 
                                getEditorPreview={this.handleGetPreview}/>
                            <Button variant="contained" 
                                color="primary" 
                                onClick={this.handleSaveTemplate}>Save</Button>
                        </div>
                        <div className="right-buttons">
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                this.saved = false 
								this.handleSaveTemplate()}}
                            >Save As</Button>
                            <Modal 
                                type="create-exit" 
                                saveAndExit={this.handleSaveTemplate}/>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Edit;