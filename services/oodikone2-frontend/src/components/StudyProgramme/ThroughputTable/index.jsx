import React, { Fragment, useState } from 'react'
import moment from 'moment'
import { Header, Table, Grid, Icon, Label, Segment, Dropdown, Button } from 'semantic-ui-react'
import { shape, number, arrayOf, bool, string, node } from 'prop-types'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { flatten, uniq, range } from 'lodash'
import { getUserRoles } from '../../../common'
import InfoBox from '../../InfoBox'
import infotooltips from '../../../common/InfoToolTips'

const getMonths = year => {
  const end = moment()
  const lastDayOfMonth = moment(end).endOf('month')
  const start = `${year}-08-01`
  return Math.round(moment.duration(moment(lastDayOfMonth).diff(moment(start))).asMonths())
}

const PopulationStatisticsLink = ({ studyprogramme, year: yearLabel, children }) => {
  const year = Number(yearLabel.slice(0, 4))
  const months = Math.ceil(moment.duration(moment().diff(`${year}-08-01`)).asMonths())
  const href =
    `/populations?months=${months}&semesters=FALL&semesters=` +
    `SPRING&studyRights=%7B"programme"%3A"${studyprogramme}"%7D&year=${year}`
  return (
    <Link title={`Population statistics of class ${yearLabel}`} to={href}>
      {children}
    </Link>
  )
}

const TotalPopulationLink = ({ confirm, years, studyprogramme, children }) => {
  const confirmWrapper = e => {
    if (confirm) {
      // eslint-disable-next-line no-alert
      const c = window.confirm(
        `Are you sure you want to see a combined population of ${years.length} different populations?`
      )
      if (!c) e.preventDefault()
    }
  }
  const yearsString = years.map(year => year.value).join('&years=')
  const months = getMonths(Math.min(...years.map(year => Number(year.value))))
  const href =
    years.length > 1
      ? `/populations?months=${months}&semesters=FALL&semesters=` +
        `SPRING&studyRights=%7B"programme"%3A"${studyprogramme}"%7D&year=${years[0].value}&years=${yearsString}`
      : `/populations?months=${months}&semesters=FALL&semesters=` +
        `SPRING&studyRights=%7B"programme"%3A"${studyprogramme}"%7D&year=${years[0].value}&years[]=${yearsString}`
  return (
    <Link onClick={confirmWrapper} title="Population statistics of all years" to={href}>
      {children}
    </Link>
  )
}

PopulationStatisticsLink.propTypes = {
  studyprogramme: string.isRequired,
  year: string.isRequired,
  children: node.isRequired
}

TotalPopulationLink.defaultProps = {
  confirm: false
}

TotalPopulationLink.propTypes = {
  studyprogramme: string.isRequired,
  years: arrayOf(shape({})).isRequired,
  children: node.isRequired,
  confirm: bool
}

const ThroughputTable = ({ throughput, thesis, loading, error, studyprogramme, userRoles, history, newProgramme }) => {
  const [lowerYear, setLower] = useState(null)
  const [upperYear, setUpper] = useState(null)
  const data = throughput && throughput.data ? throughput.data.filter(year => year.credits.length > 0) : []

  const years = data
    ? data
        .map(stats => ({
          key: stats.year.substring(0, 4),
          text: stats.year,
          value: stats.year.substring(0, 4)
        }))
        .sort((year1, year2) => Number(year2.value) - Number(year1.value))
    : []

  if (error) return <h1>Oh no so error {error}</h1>

  const GRADUATED_FEATURE_TOGGLED_ON = userRoles.includes('dev')
  const TRANSFERRED_FROM_FEATURE_TOGGLED_ON = userRoles.includes('admin')
  const CANCELLED_FEATURE_TOGGLED_ON = userRoles.includes('admin')

  const genders = data.length > 0 ? uniq(flatten(data.map(year => Object.keys(year.genders)))) : []
  const renderGenders = genders.length > 0

  const calculateTotalNationalities = () =>
    data.length > 0 ? Object.values(throughput.totals.nationalities).reduce((res, curr) => res + curr, 0) : 0

  const renderRatioOfFinns = calculateTotalNationalities() > 0
  let thesisTypes = []
  if (thesis) {
    thesisTypes = thesis.map(t => t.thesisType)
  }

  const handleLowerBoundChange = (event, { value }) => {
    event.preventDefault()
    if (Number(value) > Number(upperYear)) {
      setUpper(value)
      setLower(value)
    } else {
      setLower(value)
    }
  }

  const handleUpperBoundChange = (event, { value }) => {
    event.preventDefault()
    if (Number(value) < Number(lowerYear)) {
      setUpper(value)
      setLower(value)
    } else {
      setUpper(value)
    }
  }

  const pushQueryToUrl = () => {
    const yearRange = range(Number(lowerYear), Number(upperYear) + 1)
    const months = getMonths(Number(lowerYear))
    const yearsString = yearRange.join('&years=')
    if (yearRange.length > 1) {
      history.push(
        `/populations?months=${months}&semesters=FALL&semesters=` +
          `SPRING&studyRights=%7B"programme"%3A"${studyprogramme}"%7D&year=${lowerYear}&years=${yearsString}`
      )
    } else {
      history.push(
        `/populations?months=${months}&semesters=FALL&semesters=` +
          `SPRING&studyRights=%7B"programme"%3A"${studyprogramme}"%7D&year=${lowerYear}&years[]=${yearsString}`
      )
    }
  }

  const renderStudentsHeader = () => {
    let colSpan = 1
    let rowSpan = 1

    if (renderGenders) colSpan += genders.length
    if (renderRatioOfFinns) colSpan += 1
    if (!renderGenders && !renderRatioOfFinns) rowSpan += 1

    return (
      <Table.HeaderCell colSpan={colSpan} rowSpan={rowSpan}>
        Students
      </Table.HeaderCell>
    )
  }

  const ratioOfFinnsIn = year => {
    const total = Object.values(year.nationalities).reduce((res, curr) => res + curr, 0)
    return (
      <Table.Cell>
        {`${year.nationalities.Finland || 0} (${Math.floor((year.nationalities.Finland / total) * 100) || 0}%)`}
      </Table.Cell>
    )
  }

  return (
    <React.Fragment>
      <Header>
        <Grid columns={2}>
          <Grid.Row>
            <Grid.Column>
              Population progress
              {throughput && (
                <Header.Subheader>
                  {`Last updated ${
                    throughput.lastUpdated ? moment(throughput.lastUpdated).format('HH:mm:ss MM-DD-YYYY') : 'unknown'
                  }`}
                  {throughput.status === 'RECALCULATING' && (
                    <Label content="Recalculating! Refresh page in a few minutes" color="red" />
                  )}
                </Header.Subheader>
              )}
            </Grid.Column>
            <Grid.Column>
              <InfoBox content={infotooltips.PopulationOverview.Overview} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Header>
      <Segment basic loading={loading} style={{ overflowX: 'auto' }}>
        <Table celled structured compact striped selectable className="fixed-header">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell rowSpan="2">Year</Table.HeaderCell>
              {renderStudentsHeader()}
              <Table.HeaderCell rowSpan="2" colSpan="1">
                Started
              </Table.HeaderCell>
              {CANCELLED_FEATURE_TOGGLED_ON && (
                <Table.HeaderCell rowSpan="2" colSpan="1">
                  Cancelled
                </Table.HeaderCell>
              )}

              <Table.HeaderCell colSpan={GRADUATED_FEATURE_TOGGLED_ON ? '3' : '1'}>Graduated</Table.HeaderCell>

              <Table.HeaderCell rowSpan="1" colSpan={TRANSFERRED_FROM_FEATURE_TOGGLED_ON ? '2' : '1'}>
                Transferred
              </Table.HeaderCell>
              <Table.HeaderCell colSpan="5">Credits</Table.HeaderCell>
              {(thesisTypes.includes('BACHELOR') || thesisTypes.includes('MASTER')) && (
                <Table.HeaderCell colSpan={thesisTypes.length}>Thesis</Table.HeaderCell>
              )}
            </Table.Row>

            <Table.Row>
              {renderGenders || renderRatioOfFinns ? <Table.HeaderCell content="Total" /> : null}
              {genders.map(gender => (
                <Table.HeaderCell key={gender} content={gender} />
              ))}
              {renderRatioOfFinns ? <Table.HeaderCell content="Finnish" /> : null}
              <Table.HeaderCell>Graduated overall</Table.HeaderCell>
              {GRADUATED_FEATURE_TOGGLED_ON && (
                <Fragment>
                  <Table.HeaderCell>Graduated in time</Table.HeaderCell>
                  <Table.HeaderCell>Graduation median time</Table.HeaderCell>
                </Fragment>
              )}
              <Table.HeaderCell content="to" />
              {TRANSFERRED_FROM_FEATURE_TOGGLED_ON && <Table.HeaderCell content="from" />}

              <Table.HeaderCell content="≥ 30" />
              <Table.HeaderCell content="≥ 60" />
              <Table.HeaderCell content="≥ 90" />
              <Table.HeaderCell content="≥ 120" />
              <Table.HeaderCell content="≥ 150" />
              {thesisTypes.includes('MASTER') && <Table.HeaderCell content="Master" />}
              {thesisTypes.includes('BACHELOR') && <Table.HeaderCell content="Bachelor" />}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data
              .sort((year1, year2) => Number(year2.year.slice(0, 4)) - Number(year1.year.slice(0, 4)))
              .map(year => (
                <Table.Row key={year.year}>
                  <Table.Cell>
                    {year.year}
                    <PopulationStatisticsLink studyprogramme={studyprogramme} year={year.year}>
                      <Icon name="level up alternate" />
                    </PopulationStatisticsLink>
                  </Table.Cell>
                  <Table.Cell>{year.credits.length}</Table.Cell>
                  {genders.map(gender => (
                    <Table.Cell key={`${year.year} gender:${gender}`}>
                      {`${year.genders[gender] || 0} (${Math.floor(
                        (year.genders[gender] / year.credits.length) * 100
                      ) || 0}%)`}
                    </Table.Cell>
                  ))}
                  {renderRatioOfFinns && ratioOfFinnsIn(year)}
                  <Table.Cell>{year.started}</Table.Cell>
                  {CANCELLED_FEATURE_TOGGLED_ON && <Table.Cell>{year.cancelled}</Table.Cell>}
                  <Table.Cell>{year.graduated}</Table.Cell>
                  {GRADUATED_FEATURE_TOGGLED_ON && (
                    <Fragment>
                      <Table.Cell>{year.inTargetTime}</Table.Cell>
                      <Table.Cell>{year.medianGraduationTime ? `${year.medianGraduationTime} months` : '∞'}</Table.Cell>
                    </Fragment>
                  )}

                  <Table.Cell>{year.transferred}</Table.Cell>
                  {TRANSFERRED_FROM_FEATURE_TOGGLED_ON && <Table.Cell>{year.transferredFrom}</Table.Cell>}
                  {Object.keys(year.creditValues).map(creditKey => (
                    <Table.Cell key={`${year.year} credit:${creditKey}`}>{year.creditValues[creditKey]}</Table.Cell>
                  ))}
                  {thesisTypes.includes('MASTER') ? <Table.Cell>{year.thesisM}</Table.Cell> : null}
                  {thesisTypes.includes('BACHELOR') ? <Table.Cell>{year.thesisB}</Table.Cell> : null}
                </Table.Row>
              ))}
          </Table.Body>
          {throughput && throughput.totals ? (
            <Table.Footer>
              <Table.Row>
                <Table.HeaderCell style={{ fontWeight: 'bold' }}>
                  Total{' '}
                  {newProgramme && years.length > 0 ? (
                    <TotalPopulationLink confirm studyprogramme={studyprogramme} years={years}>
                      <Icon name="level up alternate" />
                    </TotalPopulationLink>
                  ) : null}
                </Table.HeaderCell>
                <Table.HeaderCell>{throughput.totals.students}</Table.HeaderCell>
                {Object.keys(throughput.totals.genders).map(genderKey => (
                  <Table.HeaderCell key={`${genderKey}total`}>
                    {`${throughput.totals.genders[genderKey]} (${Math.floor(
                      (throughput.totals.genders[genderKey] / throughput.totals.students) * 100
                    )}%)`}
                  </Table.HeaderCell>
                ))}
                {renderRatioOfFinns ? (
                  <Table.HeaderCell>
                    {`${throughput.totals.nationalities.Finland || 0} (${Math.floor(
                      (throughput.totals.nationalities.Finland / calculateTotalNationalities()) * 100
                    ) || 0}%)`}
                  </Table.HeaderCell>
                ) : null}
                <Table.HeaderCell>{throughput.totals.started}</Table.HeaderCell>
                {CANCELLED_FEATURE_TOGGLED_ON && <Table.HeaderCell>{throughput.totals.cancelled}</Table.HeaderCell>}
                <Table.HeaderCell>{throughput.totals.graduated}</Table.HeaderCell>
                {GRADUATED_FEATURE_TOGGLED_ON && (
                  <Fragment>
                    <Table.HeaderCell>{throughput.totals.inTargetTime}</Table.HeaderCell>
                    <Table.HeaderCell>
                      {throughput.totals.medianGraduationTime
                        ? `${throughput.totals.medianGraduationTime} months`
                        : '∞'}
                    </Table.HeaderCell>
                  </Fragment>
                )}

                <Table.HeaderCell>{throughput.totals.transferred}</Table.HeaderCell>
                {TRANSFERRED_FROM_FEATURE_TOGGLED_ON && (
                  <Table.HeaderCell>{throughput.totals.transferredFrom}</Table.HeaderCell>
                )}
                {Object.keys(throughput.totals.credits).map(creditKey => (
                  <Table.HeaderCell key={`${creditKey}total`}>{throughput.totals.credits[creditKey]}</Table.HeaderCell>
                ))}
                {thesisTypes.includes('MASTER') ? (
                  <Table.HeaderCell>{throughput.totals.thesisM}</Table.HeaderCell>
                ) : null}
                {thesisTypes.includes('BACHELOR') ? (
                  <Table.HeaderCell>{throughput.totals.thesisB}</Table.HeaderCell>
                ) : null}
              </Table.Row>
            </Table.Footer>
          ) : null}
        </Table>
      </Segment>
      {userRoles.includes('admin') && years.length > 0 ? (
        <>
          Statistics from:
          <Dropdown selection options={years} onChange={handleLowerBoundChange} value={lowerYear} />
          to:
          <Dropdown selection options={years} onChange={handleUpperBoundChange} value={upperYear} />
          <Button disabled={!lowerYear || !upperYear} onClick={pushQueryToUrl}>
            fetch combined population
          </Button>
        </>
      ) : null}
    </React.Fragment>
  )
}

ThroughputTable.propTypes = {
  throughput: shape({
    lastUpdated: string,
    status: string,
    data: arrayOf(
      shape({
        year: string,
        credits: arrayOf(number),
        thesisM: number,
        thesisB: number,
        graduated: number
      })
    )
  }),
  thesis: arrayOf(
    shape({
      programmeCode: string,
      courseCode: string,
      thesisType: string,
      createdAt: string,
      updatedAt: string
    })
  ),
  studyprogramme: string.isRequired,
  loading: bool.isRequired,
  error: bool.isRequired,
  userRoles: arrayOf(string).isRequired,
  history: shape({}).isRequired,
  newProgramme: bool.isRequired
}

ThroughputTable.defaultProps = {
  throughput: null,
  thesis: undefined
}

const mapStateToProps = ({
  auth: {
    token: { roles }
  }
}) => ({ userRoles: getUserRoles(roles) })

export default connect(mapStateToProps)(ThroughputTable)
