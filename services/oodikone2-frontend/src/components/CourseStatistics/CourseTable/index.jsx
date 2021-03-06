import React from 'react'
import { sortBy } from 'lodash'
import { Segment, Table } from 'semantic-ui-react'
import { func, arrayOf, shape, string, bool } from 'prop-types'
import { getActiveYears } from '../courseStatisticsUtils'

import './courseTable.css'

const CourseTable = ({ courses, onSelectCourse, hidden, title, emptyListText, mandatory = false }) => {
  const noContent = courses.length === 0
  const sortCourses = courses => sortBy(courses, course => course.name)

  const getEmptyListRow = () => (
    <Table.Row>
      <Table.Cell colSpan="3" content={emptyListText} />
    </Table.Row>
  )

  const toCourseRow = course => (
    <Table.Row
      style={{ cursor: 'pointer' }}
      key={course.code}
      onClick={() => (course.min_attainment_date || mandatory ? onSelectCourse(course) : null)}
    >
      <Table.Cell width={10}>
        <div>{course.name}</div>
        <div>{getActiveYears(course)}</div>
      </Table.Cell>
      <Table.Cell content={!course.alternatives ? course.code : course.alternatives.map(a => a.code).join(', ')} />
    </Table.Row>
  )

  return (
    !hidden && (
      <Segment basic style={{ padding: '0' }}>
        <Table selectable className="fixed-header">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell content={title} />
              <Table.HeaderCell content="Code" />
            </Table.Row>
          </Table.Header>
          <Table.Body>{noContent ? getEmptyListRow() : sortCourses(courses).map(toCourseRow)}</Table.Body>
        </Table>
      </Segment>
    )
  )
}

CourseTable.propTypes = {
  courses: arrayOf(shape({ code: string, name: string, seleted: bool })).isRequired,
  onSelectCourse: func.isRequired,
  hidden: bool.isRequired,
  title: string.isRequired,
  emptyListText: string,
  controlIcon: string.isRequired
}

CourseTable.defaultProps = {
  emptyListText: 'No results.'
}

function areEqual(prevProps, nextProps) {
  if (prevProps.courses.length !== nextProps.courses.length) {
    return false
  }
  return true
}

export default React.memo(CourseTable, areEqual)
