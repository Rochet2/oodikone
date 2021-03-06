import React from 'react'
import { connect } from 'react-redux'
import { func, shape, string } from 'prop-types'
import { getTranslate, getActiveLanguage } from 'react-localize-redux'
import { Segment, Header } from 'semantic-ui-react'
import { withRouter } from 'react-router-dom'

import { findStudents, getStudent, selectStudent } from '../../redux/students'
import StudentSearch from '../StudentSearch'
import StudentDetails from '../StudentDetails'
import StudentNameVisibilityToggle from '../StudentNameVisibilityToggle'
import { useTitle } from '../../common'

import { toggleStudentNameVisibility } from '../../redux/settings'

const StudentStatistics = props => {
  const { translate, match } = props
  const { studentNumber } = match.params

  useTitle('Student statistics')

  return (
    <div className="segmentContainer">
      <Header className="segmentTitle" size="large">
        {translate('studentStatistics.header')}
      </Header>
      <StudentNameVisibilityToggle />
      <Segment className="contentSegment">
        <StudentSearch translate={translate} studentNumber={studentNumber} />
        <StudentDetails translate={translate} studentNumber={studentNumber} />
      </Segment>
    </div>
  )
}

StudentStatistics.propTypes = {
  translate: func.isRequired,
  match: shape({
    params: shape({
      studentNumber: string
    })
  })
}

StudentStatistics.defaultProps = {
  match: {
    params: { studentNumber: undefined }
  }
}

const mapStateToProps = ({ localize, students }) => ({
  translate: getTranslate(localize),
  currentLanguage: getActiveLanguage(localize).value,
  student: students.data.find(student => student.studentNumber === students.selected)
})
const mapDispatchToProps = dispatch => ({
  toggleStudentNameVisibility,
  findStudents: searchStr => dispatch(findStudents(searchStr)),
  getStudent: studentNumber => dispatch(getStudent(studentNumber)),
  selectStudent: studentNumber => dispatch(selectStudent(studentNumber))
})

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(StudentStatistics)
)
