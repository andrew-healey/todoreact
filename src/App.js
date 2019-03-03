import React, {
  Component
} from 'react';
import './App.css';
import io from 'socket.io-client';
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
      todo: []
    };
  }
  componentDidMount() {
    this.socket = io();
    this.socket.on("list-content", content => {
      if(content===null){
        alert("Error: List does not exist");
      }
      content = JSON.parse(content);
      console.log("Received content is ", content);
      console.log(typeof content);
      this.setState({
        todo: content
      });
      console.log("done");
    });
    this.urlParams = new URLSearchParams(window.location.search);
    let key = this.urlParams.get("key");
    console.log("key is", key);
    if (key !== null) {
      this.socket.emit("connect-list", key);
    } else {
      this.socket.on("list-key", key => {
        console.log("list-key with", key);
        this.setState({
          key
        });
      });
      console.log("Emitting create-list");
      this.socket.emit("create-list", "Homework");
    }
    /*this.setState({todo:JSON.parse(document.cookie||"{}")});
    window.onbeforeunload=()=>{
      document.cookie=JSON.stringify(this.state.todo);
    }*/
  }
  render() {
    console.log("todo is",this.state.todo);
    let todos = this.state.todo.map((i, index) => (
      <Todo timeFrame={i.time}
              key={index}
              urgency={i.urgency}
	      color={i.color}
              checked={i.checked}
	      update={(name,value)=>this.update(index,name,value)}
	      check={() => this.check(i)} text={i.text}
     	      editing={i.editing} 
	      delete={()=>this.delete(i)}
            />));
    return (
      <div className="TodoList">
        <h1>Todo</h1>
	{todos.length===0?"Press the Plus button below to add a Todo.":todos
        }
	<h1 style={{fontSize:"50px"}} onClick={()=>this.addTodo()}>+</h1>
  {this.state.hasOwnProperty("key")?<a href={"/?key="+this.state.key}>Share</a>:undefined}
      </div>)
  }
  componentDidUpdate() {
    if (this.toSend) {
      console.log("Sending ", this.toSend);
      this.socket.emit("edit-item", ...this.toSend);
      this.toSend = false;

    }
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
    let newTodo = this.Todo("", "", "", "", "white");
    this.setState({
      todo: [...this.state.todo, newTodo]
    });
    this.socket.emit("append-item", JSON.stringify(newTodo));
  }
  check(id) {
    let newTodoState = this.state.todo;
    newTodoState[id].checked = !newTodoState[id];
    this.setState({
      todo: newTodoState
    });
    console.log("idContent is ", newTodoState);
    this.socket.emit("edit-item", id, JSON.stringify(newTodoState[id]));
  }
  delete(id) {
    let todo = this.state.todo.splice(0, id).concat(this.state.todo.splice(Math.min(id + 1, this.state.todo.length - 1)));
    this.setState({
      todo
    });
    this.socket.emit("delete-item", id);
  }
  Todo(text, time, urgency, color) {
    return ({
      time,
      urgency,
      color,
      text,
      checked: false,
      editing: true
    });
  }
  update(id, name, value) {
    let todo = this.state.todo;
    console.log(todo, id, todo[id]);
    todo[id][name] = value;
    this.setState({
      todo
    });
    if (name === "editing") {
      this.toSend = [id,JSON.stringify(todo[id])];
    }
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
    let editing = this.state.editing;
    this.setState({
      editing: !editing
    });
    this.props.update("editing", !editing);
  }
  componentDidMount() {
    this.refs.checkBox.checked = this.props.checked;
  }
  componentDidUpdate(){
    this.componentDidMount();
  }
  render() {
    this.state.editing=this.props.editing;
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
    this.state.value=this.props.value;
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
