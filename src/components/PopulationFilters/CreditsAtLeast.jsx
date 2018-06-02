import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Segment, Icon, Input, Button, Form } from 'semantic-ui-react'
import { shape, func } from 'prop-types'

import { creditsAtLeast } from '../../populationFilters'
import { removePopulationFilter, setPopulationFilter } from '../../redux/populationFilters'

class CreditsAtLeast extends Component {
  static propTypes = {
    filter: shape({}).isRequired,
    removePopulationFilter: func.isRequired,
    setPopulationFilter: func.isRequired
  }

  state = {
    limit: ''
  }

  handleChange = (e) => {
    this.setState({ limit: e.target.value })
  }

  handleLimit = () => {
    this.props.setPopulationFilter(creditsAtLeast(this.state.limit))
    this.setState({ limit: '' })
  }

  clearFilter = () => {
    this.props.removePopulationFilter(this.props.filter.id)
  }

  render() {
    const { filter } = this.props

    if (filter.notSet) {
      return (
        <Segment>
          <Form>
            <Form.Group inline>
              <Form.Field>
                <label>Show only students with credits at least</label>
              </Form.Field>
              <Form.Field>
                <Input
                  type="number"
                  onChange={this.handleChange}
                  value={this.state.limit}
                />
              </Form.Field>
              <Form.Field>
                <Button
                  onClick={this.handleLimit}
                  disabled={this.state.limit.length === 0}
                >
                  set filter
                </Button>
              </Form.Field>
            </Form.Group>
          </Form>
        </Segment>
      )
    }

    return (
      <Segment>
        Credits at least {filter.params[0]}
        <span style={{ float: 'right' }}>
          <Icon name="remove" onClick={this.clearFilter} />
        </span>
      </Segment>
    )
  }
}

export default connect(
  null,
  { setPopulationFilter, removePopulationFilter }
)(CreditsAtLeast)