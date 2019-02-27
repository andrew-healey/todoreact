import React, {
    Component
} from 'react';
import './App.css';
//Main root of app
class App extends Component {
    render() {
        return (<div className="App">
      <TodoList /></div>);
    }
}
//Any todo list - takes in no parameters
class TodoList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            todo: {},
        };
    }
    componentDidMount(){
      this.setState({todo:JSON.parse(document.cookie||"{}")});
      window.onbeforeunload=()=>{
        document.cookie=JSON.stringify(this.state.todo);
      }
    }
    render() {
        let todos = Object.keys(this.state.todo).map(i => (
            <Todo timeFrame={this.state.todo[i].time}
              key={i}
              urgency={this.state.todo[i].urgency}
	      color={this.state.todo[i].color}
              checked={this.state.todo[i].checked}
	      update={(name,value)=>this.update(i,name,value)}
	      check={() => this.check(i)} text={this.state.todo[i].text}
     	      editing={this.state.todo[i].editing} 
	      delete={()=>this.delete(i)}
            />));
        return (
            <div className="TodoList">
        <h1>Todo</h1>
	{todos.length===0?"Press the Plus button below to add a Todo.":todos
        }
	<h1 style={{fontSize:"50px"}} onClick={()=>this.addTodo()}>+</h1>
      </div>);
    }
    componentDidUpdate(){
      
    }
    testValues() { //Add R&E and debate homework
        let todos = [this.Todo('R&E Packet', '30 min-1 hr',
            'High',
            'orange',
        ), this.Todo('Debate Homework', '30 min',
            'Very high',
            'red',
        )];
        this.setState({
            todo: Object.assign({}, this.state.todo, ...todos)
        });
    }
    addTodo() {
        this.setState({
            todo: Object.assign({}, this.state.todo, this.Todo("", "", "", "white"))
        });
    }
    check(id) {
        this.setState({
            todo: Object.assign({}, this.state.todo, {
                [id]: {
                    ...this.state.todo[id],
                    checked: !this.state.todo[id].checked,
                },
            })
        });
    }
    delete(id) {
        let {
            [id]: del, ...rest
        } = this.state.todo;
        console.log(rest);
        this.setState({
            todo: rest
        });
    }
    Todo(text, time, urgency, color) {
        return ({
            [Math.random()]: {
                time,
                urgency,
                color,
                text,
                checked: false,
                editing:true
            },
        });
    }
    update(id, name, value) {
        this.setState({
            todo: Object.assign({}, this.state.todo, {
                [id]: Object.assign({}, this.state.todo[id], {
                    [name]: value
                })
            })
        })
    }
}
//Any todo element - takes in a color, a callback function for changes, urgency, name and time
class Todo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editing: this.props.editing === true
        };
    }
    toggleEdit() {
        let editing=this.state.editing;
        this.setState({
            editing: !editing
        });
        this.props.update("editing",!editing);
    }
    componentDidMount(){
      this.refs.checkBox.checked=this.props.checked;
    }
    render() {
        return <div className="Todo" style={{backgroundColor:this.props.checked?"lightgreen":this.props.color}}>
      <span className="checkContainer">
        <input className="check MutableValue"
          type="checkbox"
          onChange={
            this.props.check
	  } ref="checkBox" />
	</span>
		    {this.props.checked ? ("Done"): (
		    <>
			    <span className="colorContainer">
				    <MutableValue type="color" value={this.props.color} hidden={true} callback={val=>this.props.update("color",val)} editing={this.state.editing}/>
			    </span>
	<span className="descContainer">
		<MutableValue value={this.props.text} name="Description" callback={val=>this.props.update("text",val)} editing={this.state.editing} />
				</span>
          <span className="urgencyContainer">
		  Urgency: <MutableValue value={
          this.props.urgency
		  } callback={val=>this.props.update("urgency",val)} editing={this.state.editing} />
	  </span>
        <span className="timeFrameContainer">
		Time Estimate: <MutableValue value={
          this.props.timeFrame
		} callback={val=>this.props.update("time",val)} editing={this.state.editing} />
	</span>
        <span className="MutableValue">
	<input type="button" value="✎" onClick={()=>{this.toggleEdit();}}/>
		    </span>
			    <span>
				    <button onClick={this.props.delete}><span role="img" aria-label="X">❌</span></button>
			    </span>
    </>)}
    </div>;
    }
}
//Any mutable value - takes in a starting value and a callback function (for changing the value and storing it somewhere)
class MutableValue extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: this.props.value
        }
        this.onChange = this.onChange.bind(this);
    }
    render() {
        return <span className="MutableValue">{this.props.editing ?
		    (<input type={this.props.type||"text"} placeholder={this.props.name||""} value={this.props.value} size={this.state.value.length} onChange={this.onChange}/>) :
			    (this.props.hidden===true?undefined:this.state.value)}</span>;
    }
    onChange(event) {
        this.setState({
            value: event.target.value
        });
        this.props.callback(event.target.value);
    }
}
export default App;