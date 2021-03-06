import React, { useState } from 'react'
import { connect } from 'react-redux'
import { getActiveLanguage } from 'react-localize-redux'
import { Segment, Icon, Button, Form, Dropdown, Popup } from 'semantic-ui-react'
import { shape, func, string } from 'prop-types'
import infoTooltips from '../../common/InfoToolTips'
import { extentGraduated } from '../../populationFilters'
import { removePopulationFilter, setPopulationFilter } from '../../redux/populationFilters'
import { getTextIn } from '../../common'

const SimpleExtentGraduated = props => {
  SimpleExtentGraduated.propTypes = {
    setPopulationFilter: func.isRequired,
    programme: shape({}).isRequired,
    removePopulationFilter: func.isRequired,
    filter: shape({}).isRequired,
    language: string.isRequired,
    code: string.isRequired
  }
  const [complemented, setComplemented] = useState('false') // illegal to pass boolean values as Dropdown options value :(

  const complementedOptions = [{ value: 'false', text: 'have' }, { value: 'true', text: 'have not' }]

  const handleChange = (e, data) => {
    setComplemented(data.value)
  }

  const handleLimit = () => {
    props.setPopulationFilter(extentGraduated({ code: props.code, graduated: 'grad', complemented, simple: true }))
  }

  const clearFilter = () => {
    props.removePopulationFilter(props.filter.id)
  }

  const { filter, programme, language } = props

  if (filter.notSet) {
    return (
      <Segment>
        <Form>
          <Popup
            content={infoTooltips.PopulationStatistics.Filters.ExtentGraduated}
            trigger={<Icon style={{ float: 'right' }} name="info" />}
          />
          <Form.Group inline>
            <Form.Field>
              <label>Students that</label>
            </Form.Field>
            <Form.Field>
              <Dropdown
                fluid
                placeholder="have/not"
                name="complemented"
                onChange={handleChange}
                options={complementedOptions}
                selectOnBlur={false}
                selectOnNavigation={false}
              />
            </Form.Field>
            <label>{`graduated from ${getTextIn(programme, language)}`}</label>
            <Form.Field>
              <Button onClick={handleLimit}>set filter</Button>
            </Form.Field>
          </Form.Group>
        </Form>
      </Segment>
    )
  }

  return (
    <Segment>
      <label>
        {`Showing students that ${
          filter.params.complemented === 'true' ? 'have not' : 'have'
        } graduated from ${getTextIn(programme, language)}`}
      </label>
      <span style={{ float: 'right' }}>
        <Icon name="remove" onClick={clearFilter} />
      </span>
    </Segment>
  )
}

const mapStateToProps = ({ localize, populations, populationDegreesAndProgrammes }) => {
  const code = populations.query.studyRights.programme
  const studyrightName = populationDegreesAndProgrammes.data.programmes[code].name
  return { language: getActiveLanguage(localize).code, programme: studyrightName, code }
}

export default connect(
  mapStateToProps,
  { setPopulationFilter, removePopulationFilter }
)(SimpleExtentGraduated)
