import React, { Component } from 'react'
import { Button, Card, Divider, List, Icon, Popup, Dropdown, Header } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { getActiveLanguage } from 'react-localize-redux'
import { sortBy } from 'lodash'
import { withRouter } from 'react-router-dom'
import { string, number, shape, bool, arrayOf, func } from 'prop-types'
import { getTextIn, getUserRoles, setMocking, textAndDescriptionSearch } from '../../common'
import { removeUserUnits, setFaculties } from '../../redux/users'
import { getAccessGroups } from '../../redux/accessGroups'
import { getFaculties } from '../../redux/faculties'
import { getDegreesAndProgrammesUnfiltered } from '../../redux/populationDegreesAndProgrammesUnfiltered'
import AccessRights from './AccessRights'
import AccessGroups from './AccessGroups'
import EmailNotification from './EmailNotification'
import { getElementDetails } from '../../redux/elementdetails'

const formatToDropdown = (elements, language) => {
  const options = Object.values(elements).map(e => ({
    key: e.code,
    value: e.code,
    description: e.code,
    text: getTextIn(e.name, language)
  }))
  return sortBy(options, 'text')
}

class UserPage extends Component {
  state = {
    degree: undefined,
    programme: undefined
  }

  componentDidMount() {
    const { associations, pending, getElementDetails, elementdetails, accessGroups, faculties } = this.props
    if (elementdetails.length === 0) getElementDetails()
    if (accessGroups.data.length === 0) this.props.getAccessGroups()
    if (faculties.length === 0) this.props.getFaculties()
    if (Object.keys(associations).length === 0 && !pending) {
      this.props.getDegreesAndProgrammesUnfiltered()
    }
  }

  getDisabledUnits = (units, enabled) => {
    const enabledIds = new Set(enabled.map(element => element.code))
    return units.filter(u => !enabledIds.has(u.id))
  }

  removeAccess = (uid, unit) => () => this.props.removeUserUnits(uid, [unit])

  degreeOptions = () => {
    const { degrees } = this.props.associations
    const degreeOptions = !degrees ? [] : formatToDropdown(degrees, this.props.language)
    return degreeOptions
  }

  programmeOptions = () => {
    const { degrees, programmes } = this.props.associations
    const { degree: degreeCode } = this.state
    if (!programmes) return []
    if (degrees && degreeCode) {
      const degree = degrees[degreeCode]
      return formatToDropdown(degree.programmes, this.props.language)
    }
    return formatToDropdown(programmes, this.props.language)
  }

  specializationOptions = () => {
    const { studyTracks } = this.props.associations
    const { programme: programmeCode } = this.state
    if (!studyTracks) return []
    if (programmeCode) {
      const filteredStudyTracks = Object.values(studyTracks)
        .filter(s => s.programmes[programmeCode])
        .reduce((acc, e) => {
          acc[e.code] = e
          return acc
        }, {})
      return formatToDropdown(filteredStudyTracks, this.props.language)
    }
    return formatToDropdown(studyTracks, this.props.language)
  }

  allSpecializationIds = () => this.specializationOptions().map(sp => sp.key)

  showAs = uid => {
    setMocking(uid)
    this.props.history.push('/')
    window.location.reload()
  }

  renderUnitList = (elementdetailcodes, elementdetails, user) => {
    if (!elementdetailcodes) return null
    const { language } = this.props
    const nameInLanguage = element => getTextIn(element.name, language)
    elementdetailcodes.sort()
    return (
      <List divided>
        {elementdetails.length > 0 &&
          elementdetailcodes.map(({ elementDetailCode: code }) => {
            const element = elementdetails.find(e => e.code === code)
            return (
              <List.Item key={code}>
                <List.Content floated="right">
                  <Button
                    basic
                    negative
                    floated="right"
                    onClick={this.removeAccess(user.id, code)}
                    content="Remove"
                    size="tiny"
                  />
                </List.Content>
                <List.Content>
                  {element.type === 30 ? <Icon name="minus" /> : null} {`${nameInLanguage(element)} (${code})`}
                </List.Content>
              </List.Item>
            )
          })}
      </List>
    )
  }

  render() {
    const { user, language, elementdetails, accessGroups, isAdmin, faculties, setFaculties, goBack } = this.props

    if (!accessGroups) {
      return null
    }

    return (
      <div>
        <Button icon="arrow circle left" content="Back" onClick={goBack} />
        <Divider />
        <Card.Group>
          <Card fluid>
            <Card.Content>
              <Card.Header>
                {isAdmin && user.is_enabled && (
                  <Popup
                    content="Show Oodikone as this user"
                    trigger={
                      <Button
                        floated="right"
                        circular
                        size="tiny"
                        basic
                        icon="spy"
                        onClick={() => this.showAs(user.username)}
                      />
                    }
                  />
                )}
                {user.full_name}
              </Card.Header>
              <Divider />
              <Card.Meta content={user.username} />
              <Card.Meta content={user.email} />
              <Card.Description>
                {`Access to oodikone: ${user.is_enabled ? 'En' : 'Dis'}abled`} <br />
              </Card.Description>
            </Card.Content>
          </Card>
          <Card fluid>
            <Card.Content>
              <Card.Header content="Add study programme access rights" />
              <Divider />
              <AccessRights uid={user.id} rights={user.elementdetails} />
            </Card.Content>
          </Card>
          <Card fluid>
            <Card.Content>
              <Card.Header content="Add access group rights" />
              <Divider />
              <AccessGroups user={user} />
            </Card.Content>
          </Card>
          <Card fluid>
            <Card.Content>
              <Card.Header content="Access rights" />
              <Card.Description>
                {user.accessgroup.map(ag => ag.group_code).includes('admin') ? (
                  <p
                    style={{
                      fontSize: '34px',
                      fontFamily: 'Comic Sans',
                      color: 'darkred',
                      border: '1px'
                    }}
                  >
                    Admin access!
                  </p>
                ) : null}
                {this.renderUnitList(user.programme, elementdetails, user)}
                <Header content="Faculties" />
                <Dropdown
                  placeholder="Select faculties"
                  fluid
                  selection
                  multiple
                  value={user.faculty.map(f => f.faculty_code)}
                  options={sortBy(
                    faculties.map(f => ({
                      key: f.code,
                      text: getTextIn(f.name, language),
                      description: f.code,
                      value: f.code
                    })),
                    ['text']
                  )}
                  onChange={(__, { value: facultycodes }) => setFaculties(user.id, facultycodes)}
                  search={textAndDescriptionSearch}
                  selectOnBlur={false}
                  selectOnNavigation={false}
                />
              </Card.Description>
            </Card.Content>
          </Card>
          <Card fluid>
            <Card.Content>
              <Card.Header content="Send email about receiving access to oodikone" />
              <Card.Description>
                <Divider />
                <EmailNotification userEmail={user.email} />
              </Card.Description>
            </Card.Content>
          </Card>
        </Card.Group>
      </div>
    )
  }
}

UserPage.propTypes = {
  user: shape({
    id: string,
    full_name: string,
    is_enabled: bool,
    elementdetails: arrayOf(string),
    programme: arrayOf(
      shape({
        code: string,
        name: shape({}),
        type: number
      })
    ),
    faculty: arrayOf(
      shape({
        faculty_code: string,
        programme: arrayOf(
          shape({
            code: string,
            name: shape({}),
            type: number
          })
        )
      })
    )
  }).isRequired,
  removeUserUnits: func.isRequired,
  setFaculties: func.isRequired,
  language: string.isRequired,
  goBack: func.isRequired,
  getDegreesAndProgrammesUnfiltered: func.isRequired,
  associations: shape({}).isRequired,
  pending: bool.isRequired,
  history: shape({
    push: func.isRequired
  }).isRequired,
  getAccessGroups: func.isRequired,
  getFaculties: func.isRequired,
  getElementDetails: func.isRequired,
  elementdetails: arrayOf(shape({ type: number, code: string, name: shape({}) })).isRequired,
  faculties: arrayOf(shape({ code: string, name: shape({}) })).isRequired,
  accessGroups: shape({}).isRequired,
  isAdmin: bool.isRequired
}
const mapStateToProps = state => ({
  language: getActiveLanguage(state.localize).code,
  units: state.units.data,
  faculties: state.faculties.data,
  associations: state.populationDegreesAndProgrammesUnfiltered.data,
  pending: !!state.populationDegreesAndProgrammesUnfiltered.pending,
  elementdetails: state.elementdetails.data,
  accessGroups: state.accessGroups,
  isAdmin: getUserRoles(state.auth.token.roles).includes('admin')
})

export default connect(
  mapStateToProps,
  {
    removeUserUnits,
    setFaculties,
    getDegreesAndProgrammesUnfiltered,
    getAccessGroups,
    getFaculties,
    getElementDetails
  }
)(withRouter(UserPage))
