import React, {
  Component
} from 'react';
import './App.css';

class App extends Component {
  render() {
    return ( < div className = "App" >
      <
      h1 > Todo < /h1> <
      TodoList / >
      <
      /div>);
    }
  }
  class TodoList extends Component {
    constructor(props) {
      super(props);
      this.state = {
        todo: {},
      };
      this.addTodo('R&E Packet', '30 min-1 hr', {
        color: 'orange',
        text: 'High',
      });
      this.addTodo('Debate Homework', '30 min-1 hr', {
        color: 'red',
        text: 'Very high',
      });
    }
    render() {
        return ( < div className = "todo-list" > {
              Object.keys(this.state.todo).map(i => (this.state[i].done ? '' : < Todo timeFrame = {
                    this.state[i].time
                  }
                  urgency = {
                    this.state[i].urgency
                  }
                  check = {
                    () => {
                      this.check(i);
                    }
                  } > {
                    this.state[i].text
                  } <
                  /Todo>))
                } <
                /div>);
              }
              check(id) {
                this.setState({
                  [id]: {
                    ...this.state[id],
                    checked: !this.state[id].checked,
                  },
                });
              }
              addTodo(text, time, urgency) {
                this.setState({
                  todo: Object.assign({
                    [Math.random()]: {
                      time,
                      urgency,
                      text,
                      checked: false,
                    },
                  }, this.state.todo),
                });
              }
            }

            class Todo extends Component {
              constructor(props) {
                super(props);
                this.state = {};
              }
              render() {
                return ( < div className = "todo"
                  style = {
                    'background-color:{this.props.urgency.color}'
                  } >
                  <
                  span className = "todo-component check-container" >
                  <
                  input className = "check"
                  type = "checkbox"
                  onChange = {
                    this.props.check
                  }
                  /> < /
                  span > < span className = "todo-component desc-container" > {
                    this.props.innerText
                  } <
                  /span> <span className="todo-component urgency-container">
                  Urgency: {
                    this.props.urgency.text
                  } <
                  /span> <span className="todo-component timeFrame-container">
                  Time Estimate: {
                    this.props.timeFrame
                  } <
                  /span> < /
                  div > );
              }
            }
            export default App;
