import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Container, Header, Table, Icon, Tab } from 'semantic-ui-react'
import ReactHighcharts from 'react-highcharts'

import { callApi } from '../../apiConnection'

import '../StudentInfoCard/studentInfoCard.css'

class UsageStatistics extends Component {
  state = null

  componentDidMount() {
    document.title = 'Usage statistics - Oodikone'
  }

  componentWillMount() {
    callApi('/usage')
      .then(({ data }) => {
        this.setState(data)
      })
      .catch(e => {
        if (e.message.toLowerCase() === 'network error') {
          window.location.reload(true)
        }
      })
  }

  renderStats() {
    if (this.state === null) {
      return null
    }

    const { byUser, byEndpoint, byDate } = this.state
    const byCount = (x, y) => y.count - x.count

    const users = Object.keys(byUser).map(user => ({
      name: user,
      count: byUser[user].length
    }))

    const endpoints = Object.keys(byEndpoint).map(endpoint => ({
      name: endpoint,
      count: byEndpoint[endpoint].length
    }))

    const chartConfig = {
      xAxis: { categories: Object.keys(byDate) },
      series: [{ data: Object.keys(byDate).map(key => byDate[key]) }]
    }

    const panes = [
      {
        menuItem: 'By user',
        render: () => (
          <Table celled className="fixed-header">
            <Table.Body>
              {users.sort(byCount).map(user => (
                <Table.Row key={user.name}>
                  <Table.Cell onClick={() => this.setState({ user: user.name })}>{user.name}</Table.Cell>
                  <Table.Cell>{user.count}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )
      },
      {
        menuItem: 'By endpoint',
        render: () => (
          <Table celled className="fixed-header">
            <Table.Body>
              {endpoints.sort(byCount).map(endpoint => (
                <Table.Row key={endpoint.name}>
                  <Table.Cell>{endpoint.name}</Table.Cell>
                  <Table.Cell>{endpoint.count}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )
      },
      {
        menuItem: 'By date',
        render: () => <ReactHighcharts config={chartConfig} />
      }
    ]

    if (this.state.user) {
      const entries = this.state.all
        .filter(e => e.username === this.state.user)
        .map(({ time, ...e }) => ({ ...e, time: new Date(time) }))
        .sort((e1, e2) => e2.time.getTime() - e1.time.getTime())

      const usersName = entries[0].name

      const toTime = date => {
        const zeroed = v => (v < 10 ? `0${v}` : v)

        return `${date.getFullYear()}-${zeroed(date.getUTCMonth() + 1)}-${zeroed(date.getDate())} ${zeroed(
          date.getHours()
        )}:${zeroed(date.getMinutes())}:${zeroed(date.getSeconds())}`
      }

      return (
        <div>
          <h3>
            {usersName} ({this.state.user})
            <Icon onClick={() => this.setState({ user: null })} name="remove" className="controlIcon" />
          </h3>
          <Table celled className="fixed-header">
            <Table.Body>
              {entries.map(entry => (
                <Table.Row key={entry.id}>
                  <Table.Cell>{entry.method}</Table.Cell>
                  <Table.Cell>{entry.URL}</Table.Cell>
                  <Table.Cell>{toTime(entry.time)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )
    }

    return <Tab panes={panes} />
  }

  render() {
    return (
      <div>
        <Container text style={{ paddingTop: 50 }}>
          <Header as="h1" textAlign="center">
            Usage statistics
          </Header>
          {this.renderStats()}
        </Container>
      </div>
    )
  }
}

export default connect()(UsageStatistics)
