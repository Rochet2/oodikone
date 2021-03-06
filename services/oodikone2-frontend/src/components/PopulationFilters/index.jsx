import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Segment, Header, Button, Form, Radio, Modal, Icon, TextArea, Input, Loader } from 'semantic-ui-react'
import { object, func, arrayOf, bool, shape, string } from 'prop-types'
import { union, uniq, difference } from 'lodash'
import uuidv4 from 'uuid/v4'

import { getTranslate, getActiveLanguage } from 'react-localize-redux'
import CreditsLessThan from './CreditsLessThan'
import CreditsLessThanFromMandatory from './CreditsLessThanFromMandatory'
import CreditsAtLeast from './CreditsAtLeast'
import GradeMeanFilter from './GradeMeanFilter'
import StartingThisSemester from './StartingThisSemester'
import CourseParticipation from './CourseParticipation'
import CourseParticipationNTimes from './CourseParticipationNTimes'
import ExtentGraduated from './ExtentGraduated'
import SimpleExtentGraduated from './SimpleExtentGraduated'
import Preset from './Preset'
import SexFilter from './SexFilter'
import TagFilter from './TagFilter'
import DisciplineTypes from './DisciplineTypes'
import EnrollmentStatus from './EnrollmentStatus'
import TransferFilter from './TransferFilter'
import TransferToStudyrightFilter from './TransferToStudyrightFilter'
import CanceledStudyright from './CanceledStudyright'
import PriorityStudyright from './PriorityStudyright'
import CreditsBeforeStudyright from './CreditsBeforeStudyright'
import InfoBox from '../InfoBox'
import infotooltips from '../../common/InfoToolTips'
import {
  clearPopulationFilters,
  setComplementFilter,
  savePopulationFilters,
  setPopulationFilter
} from '../../redux/populationFilters'
import { presetFilter, getFilterFunction } from '../../populationFilters'
import { getTextIn, cancelablePromise } from '../../common'

const componentFor = {
  CreditsAtLeast,
  CreditsLessThan,
  GradeMeanFilter,
  CreditsLessThanFromMandatory,
  StartingThisSemester,
  CourseParticipationNTimes,
  DisciplineTypes,
  EnrollmentStatus,
  CourseParticipation,
  SexFilter,
  ExtentGraduated,
  TransferFilter,
  CanceledStudyright,
  PriorityStudyright,
  TransferToStudyrightFilter,
  SimpleExtentGraduated,
  TagFilter,
  CreditsBeforeStudyright
}

const advancedFilters = {
  // Filters that are too hard to use for common folk
  DisciplineTypes,
  TransferFilter,
  ExtentGraduated,
  PriorityStudyright,
  CreditsBeforeStudyright
}

const persistantFilters = {
  // Filters that can be duplicated with different values
  ExtentGraduated,
  TransferFilter
}

class PopulationFilters extends Component {
  static propTypes = {
    filters: arrayOf(object).isRequired,
    complemented: bool.isRequired,
    clearPopulationFilters: func.isRequired,
    setComplementFilter: func.isRequired,
    savePopulationFilters: func.isRequired,
    setPopulationFilter: func.isRequired,
    studyRights: shape({ programme: string, degree: string, studyTrack: string }).isRequired,
    populationFilters: shape({}).isRequired,
    populationSelectedStudentCourses: shape({}).isRequired,
    populationCourses: shape({}).isRequired
  }

  state = {
    visible: false,
    presetName: '',
    presetDescription: '',
    presetFilters: [],
    advancedUser: false,
    modalOpen: false
  }

  componentDidMount() {
    this.initialFilterLoading()
  }

  componentWillUnmount() {
    if (this.untilCoursesLoaded) this.untilCoursesLoaded.cancel()
    if (this.timeout) clearTimeout(this.timeout)
  }

  initialFilterLoading = async () => {
    const untilCoursesLoaded = () => {
      const poll = resolve => {
        const selectedPopulationCourses = this.props.populationSelectedStudentCourses.data
          ? this.props.populationSelectedStudentCourses
          : this.props.populationCourses
        const { data, pending } = selectedPopulationCourses
        if (data && !pending) {
          resolve()
        } else {
          this.timeout = setTimeout(() => poll(resolve), 400)
        }
      }
      return new Promise(poll)
    }
    this.untilCoursesLoaded = cancelablePromise(untilCoursesLoaded())
    const success = await this.untilCoursesLoaded.promise
    if (success) this.updateFilterList(this.props.populationFilters.filtersFromBackend)
  }

  formatFilter = filter => {
    let filterToSave = {}
    if (filter.type === 'Preset') {
      filterToSave = {
        ...filter,
        filters: filter.filters.map(f => this.formatFilter(f))
      }
    } else {
      filterToSave = {
        ...filter,
        params:
          filter.type === 'CourseParticipation'
            ? {
                field: filter.params.field,
                course: {
                  course: {
                    name: filter.params.course.course.name,
                    code: filter.params.course.course.code
                  }
                }
              }
            : filter.params
      }
    }
    return filterToSave
  }

  handleSavePopulationFilters = () => {
    const preset = {
      id: uuidv4(),
      name: this.state.presetName,
      description: this.state.presetDescription,
      population: Object.values(this.props.studyRights),
      filters: this.props.filters
    }
    this.setState({ presetName: '', presetDescription: '' })
    const presetToSave = {
      ...preset,
      filters: preset.filters.map(filter => this.formatFilter(filter))
    }
    this.props.savePopulationFilters(presetToSave)
    this.updateFilterList([preset])
    this.props.clearPopulationFilters()
    this.props.setPopulationFilter(presetFilter(preset))
  }

  handlePresetName = value => {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.setState({ presetName: value })
    }, 500)
  }

  handlePresetDescription = value => {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.setState({ presetDescription: value })
    }, 500)
  }

  updateFilterList(filtersToCreate) {
    const selectedPopulationCourses = this.props.populationSelectedStudentCourses.data
      ? this.props.populationSelectedStudentCourses
      : this.props.populationCourses
    // sorry for the uglyness but it kinda works (I think)
    const regenerateFilterFunctions = (filters /* eslint-disable */) =>
      filters.map(f =>
        f.type === 'Preset'
          ? getFilterFunction(
            f.type,
            { ...f, filters: regenerateFilterFunctions(f.filters) },
            selectedPopulationCourses.data
          )
          : getFilterFunction(f.type, f.params, selectedPopulationCourses.data)
      )

    if (filtersToCreate) {
      const newFilters = filtersToCreate.map(newFilter => ({
        ...newFilter,
        filters: regenerateFilterFunctions(newFilter.filters)
      }))
      this.setState({ presetFilters: this.state.presetFilters.concat(newFilters) })
    }
  }
  destroyFromAllFilters = id =>
    this.setState({ presetFilters: this.state.presetFilters.filter(filter => filter.id !== id) })

  renderAddFilters(allStudyRights) {
    const { extents, transfers, populationSelectedStudentCourses, populationCourses, tags } = this.props
    const { Add } = infotooltips.PopulationStatistics.Filters
    const selectedPopulationCourses = populationSelectedStudentCourses.data
      ? populationSelectedStudentCourses
      : populationCourses

    const allFilters = union(
      Object.keys(componentFor)
        .filter(f => !(Object.keys(advancedFilters).includes(f) && !this.state.advancedUser))
        .map(f => String(f)),
      this.state.presetFilters.map(f => f.id).filter(f => this.state.advancedUser)
    )

    const setFilters = union(
      this.props.filters.map(f => f.type),
      this.props.filters.filter(f => f.type === 'Preset').map(f => f.id)
    )
    const unsetFilters = uniq(
      difference(allFilters, setFilters.filter(setFilter => !Object.keys(persistantFilters).includes(setFilter)))
    )
    if (unsetFilters.length === 0) {
      return null
    }
    if (!this.state.visible) {
      return (
        <Segment>
          <Header>
            Add filters <InfoBox content={Add} />
          </Header>
          <Loader active={selectedPopulationCourses.pending} inline="centered" />
          <Button onClick={() => this.setState({ visible: true })} disabled={selectedPopulationCourses.pending}>
            add
          </Button>
        </Segment>
      )
    }

    return (
      <Segment>
        <Header>
          Add filters <InfoBox content={Add} />
        </Header>
        <div>
          <Radio
            toggle
            label="Advanced filters"
            checked={this.state.advancedUser}
            onChange={() => this.setState({ advancedUser: !this.state.advancedUser })}
          />
        </div>
        {unsetFilters.map(filterName => {
          //eslint-disable-line
          if (componentFor[filterName] && !(filterName === 'TagFilter' && tags.length < 1)) {
            // THIS IS KINDA HACKED SOLUTION PLS FIX
            // this is awful, shame on who ever wrote this, pls fix
            // when is this going to be fixed?
            return React.createElement(componentFor[filterName], {
              filter: { notSet: true },
              key: filterName,
              samples: this.props.samples,
              transfers,
              extents,
              allStudyRights
            })
          } else if(!(filterName === 'TagFilter' && tags.length < 1)) {
            return React.createElement(Preset, {
              filter: {
                ...this.state.presetFilters.find(f => f.id === filterName),
                notSet: true
              },
              key: filterName,
              destroy: this.destroyFromAllFilters
            })
          }
        })}
        <Button onClick={() => this.setState({ visible: false })}>cancel</Button>
      </Segment>
    )
  }

  renderSetFilters(handleSave, allStudyRights) {
    const setFilters = this.props.filters.map(f => f.type)
    const { Filters } = infotooltips.PopulationStatistics.Filters
    if (setFilters.length === 0) {
      return null
    }

    return (
      <Segment>
        <Header>
          Filters <InfoBox content={Filters} />
        </Header>
        {this.props.filters.map(filter => {
          if (filter.type !== 'Preset') {
            return React.createElement(componentFor[filter.type], {
              filter,
              key: filter.id,
              samples: this.props.samples,
              transfers: this.props.transfers,
              extents: this.props.extents,
              allStudyRights
            })
          }
          return React.createElement(Preset, {
            filter,
            key: filter.id,
            destroy: this.destroyFromAllFilters
          })
        })}
        <Form>
          <Form.Group inline>
            <Form.Field>
              <label>Show excluded students only</label>
            </Form.Field>
            <Form.Field>
              <Radio toggle checked={this.props.complemented} onClick={this.props.setComplementFilter} />
            </Form.Field>
          </Form.Group>
        </Form>

        <Button onClick={this.props.clearPopulationFilters}>clear all filters</Button>
        {this.state.advancedUser ? (
          <Modal
            trigger={<Button onClick={() => this.setState({ modalOpen: true })}>Save filters as preset</Button>}
            open={this.state.modalOpen}
            onClose={() => this.setState({ modalOpen: false })}
            size="small"
          >
            <Header />
            <Modal.Content>
              <Form>
                <Form.Field>
                  <h2> Save current filters as preset </h2>
                  <em> This filter is saved in this population for future use </em>
                  <Input
                    placeholder="Name..."
                    maxLength={40}
                    onChange={e => this.handlePresetName(e.target.value)}
                  />
                </Form.Field>
                <Form.Field>
                  <em> explain what your filter is doing here </em>
                  <TextArea
                    placeholder="Description..."
                    maxLength={160}
                    onChange={e => this.handlePresetDescription(e.target.value)}
                  />
                </Form.Field>
              </Form>
            </Modal.Content>
            <Modal.Actions>
              <Button negative onClick={() => this.setState({ modalOpen: false })}>
                Cancel
              </Button>
              <Button
                disabled={this.state.presetName === ''}
                color="green"
                onClick={() => {
                  handleSave()
                  this.setState({ modalOpen: false })
                }}
                inverted
              >
                <Icon name="checkmark" /> Save
              </Button>
            </Modal.Actions>
          </Modal>
        ) : null}
      </Segment>
    )
  }

  render() {
    const { allStudyRights, language } = this.props
    let allStudyRightOptions = []
    if (allStudyRights) {
      allStudyRightOptions = Object.values(allStudyRights).reduce(
        (options, level) => [...options, ...level.map(sr => ({ value: sr.code, text: getTextIn(sr.name, language) }))],
        []
      )
    }
    return (
      <div>
        {this.renderAddFilters(allStudyRightOptions)}
        {this.renderSetFilters(this.handleSavePopulationFilters, allStudyRightOptions)}
      </div>
    )
  }
}

const mapStateToProps = ({
  populationFilters,
  localize,
  graphSpinner,
  populations,
  populationSelectedStudentCourses,
  populationCourses,
  tags
}) => ({
  populationSelectedStudentCourses,
  populationCourses,
  populationFilters,
  filters: populationFilters.filters,
  complemented: populationFilters.complemented,
  translate: getTranslate(localize),
  loading: graphSpinner,
  language: getActiveLanguage(localize).code,
  studyRights: populations.query.studyRights,
  allStudyRights: populations.data.studyrights,
  extents: populations.data.extents,
  transfers: populations.data.transfers,
  tags: tags.data
})

export default connect(
  mapStateToProps,
  {
    clearPopulationFilters,
    setComplementFilter,
    savePopulationFilters,
    setPopulationFilter
  }
)(PopulationFilters)
