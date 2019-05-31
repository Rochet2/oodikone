import React, { Component } from 'react'
import { arrayOf, object } from 'prop-types'
import { Button, Modal, Form, TextArea } from 'semantic-ui-react'

class CheckStudentList extends Component {
  state = { modalOpen: false, input: '', notInOodiRows: [], notInListRows: [] }

  checkStudents = (input) => {
    const inputArray = input.split('\n')
    const formattedInput = inputArray.map(number => number.trim())
    const { students } = this.props
    const snums = students.map(s => s.studentNumber)
    const notInOodi = formattedInput.filter(a => !snums.includes(a))
    const notInList = snums.filter(a => !formattedInput.includes(a))
    this.setState({
      notInOodiRows: notInOodi.map(a => <div key={a}>{a}</div>),
      notInListRows: notInList.map(a => <div key={a}>{a}</div>)
    })
  }

  renderResults() {
    return (
      <Modal trigger={<Button color="green" onClick={() => this.checkStudents(this.state.input)}>check students</Button>}>
        <Modal.Content>
          <Form>
            <h2> Results </h2>
            {this.state.notInOodiRows.length > 0 ? (
              <div>student numbers in list not in oodi {this.state.notInOodiRows}</div>) :
              (<div>all numbers in oodi</div>)}

            {this.state.notInListRows.length > 0 ?
              (<div>student numbers in oodi but not in list {this.state.notInListRows}</div>) :
              (<div>all numbers in list</div>)}

          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button
            color="green"
            onClick={() => {
              this.setState({ modalOpen: false })
            }}
            inverted
          >
            Close
          </Button>
        </Modal.Actions>
      </Modal>
    )
  }

  render() {
    return (
      <Modal
        trigger={<Button size="small" onClick={() => this.setState({ modalOpen: true })}>Check studentnumbers</Button>}
        open={this.state.modalOpen}
        onClose={() => this.setState({ modalOpen: false })}
        size="small"
      >
        <Modal.Content>
          <Form>
            <h2> Check for studentnumbers </h2>
            <Form.Field>
              <em> Insert studentnumbers you wish to check here </em>
              <TextArea placeholder="011111111" onChange={e => this.setState({ input: e.target.value })} />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button
            negative
            onClick={() => this.setState({ modalOpen: false })}
          >Cancel
          </Button>
          {this.renderResults()}
        </Modal.Actions>
      </Modal>
    )
  }
}

CheckStudentList.propTypes = {
  students: arrayOf(object).isRequired
}

export default CheckStudentList