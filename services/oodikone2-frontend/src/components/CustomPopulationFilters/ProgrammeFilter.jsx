import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { Segment, Icon, Button, Form, Dropdown, Popup } from 'semantic-ui-react'
import { func, shape, string, arrayOf } from 'prop-types'
import { programmeFilter } from '../../populationFilters'
import { textAndDescriptionSearch, getNewestProgramme, getTextIn } from '../../common'

import { removePopulationFilter, setPopulationFilter } from '../../redux/populationFilters'

const ProgrammeFilter = ({
  removePopulationFilterAction,
  setPopulationFilterAction,
  allStudyrights,
  filter,
  language,
  samples,
  studentToTargetCourseDateMap,
  elementDetails
}) => {
  const [programme, setProgramme] = useState('')
  const [programmeName, setName] = useState('')
  const [options, setOptions] = useState([])

  useEffect(() => {
    const allProgrammes = {}
    samples.forEach(student => {
      const programme = getNewestProgramme(
        student.studyrights,
        student.studentNumber,
        studentToTargetCourseDateMap,
        elementDetails
      )
      if (programme) {
        if (!allProgrammes[programme.code]) {
          allProgrammes[programme.code] = { programme, students: [] }
        }
        allProgrammes[programme.code].students.push({ studentnumber: student.studentNumber })
      }
    })
    const optionsToSet = Object.keys(allProgrammes).map(code => ({
      key: code,
      text: getTextIn(allProgrammes[code].programme.name, language),
      value: code,
      description: code
    }))

    setOptions(optionsToSet)
  }, [])

  const handleFilter = () => {
    setPopulationFilterAction(programmeFilter({ programme, programmeName }, elementDetails))
  }
  const handleChange = (e, { value }) => {
    setProgramme(value)
    const chosenProgrammeName = allStudyrights.programmes.find(sr => sr.code === value)
    setName(chosenProgrammeName.name[language])
  }
  const clearFilter = () => {
    removePopulationFilterAction(filter.id)
    setProgramme('')
    setName('')
  }

  if (filter.notSet) {
    return (
      <Segment>
        <Form>
          <Popup trigger={<Icon style={{ float: 'right' }} name="info" />} />
          <Form.Group inline>
            <Form.Field>
              <label>Select students that are in programme </label>
            </Form.Field>
            <Form.Field>
              <Dropdown
                placeholder="select"
                options={options}
                onChange={handleChange}
                search={textAndDescriptionSearch}
                noResultsMessage="No selectable study programmes"
                closeOnChange
                style={{ width: '500px' }}
                selection
                selectOnBlur={false}
                selectOnNavigation={false}
              />
            </Form.Field>
            <Form.Field>
              <Button onClick={handleFilter} disabled={programme.length < 1}>
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
      Students that are in programme {filter.params.programmeName}
      <span style={{ float: 'right' }}>
        <Icon name="remove" onClick={clearFilter} />
      </span>
    </Segment>
  )
}

ProgrammeFilter.defaultProps = {
  studentToTargetCourseDateMap: null
}

ProgrammeFilter.propTypes = {
  setPopulationFilterAction: func.isRequired,
  removePopulationFilterAction: func.isRequired,
  filter: shape({}).isRequired,
  allStudyrights: shape({}).isRequired,
  language: string.isRequired,
  samples: arrayOf(shape({})).isRequired,
  studentToTargetCourseDateMap: shape({}),
  elementDetails: shape({}).isRequired
}

const mapStateToProps = ({ settings, populations }) => ({
  language: settings.language,
  elementDetails: populations.data.elementdetails.data
})

export default connect(
  mapStateToProps,
  {
    setPopulationFilterAction: setPopulationFilter,
    removePopulationFilterAction: removePopulationFilter
  }
)(ProgrammeFilter)
