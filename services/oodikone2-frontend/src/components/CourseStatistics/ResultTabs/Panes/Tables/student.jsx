import React from 'react'
import qs from 'query-string'
import { Link } from 'react-router-dom'
import { Header, Icon, Item } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { uniq } from 'lodash'
import { shape, string, number, oneOfType, arrayOf, bool } from 'prop-types'
import SortableTable from '../../../../SortableTable'

const formatPercentage = p => `${(p * 100).toFixed(2)} %`

const StudentTable = ({ stats, name, alternatives, separate }) => {
  const showPopulation = (yearcode, years) => {
    const queryObject = {
      from: yearcode,
      to: yearcode,
      coursecodes: JSON.stringify(uniq(alternatives)),
      years,
      separate
    }
    const searchString = qs.stringify(queryObject)
    return `/coursepopulation?${searchString}`
  }

  const formatted = stats.map(statistic => {
    const { name: n, code, students, coursecode } = statistic
    const { passedFirst = 0, passedRetry = 0, failedFirst = 0, failedRetry = 0 } = students.categories
    const total = passedFirst + passedRetry + failedFirst + failedRetry
    return {
      name: n,
      code,
      coursecode,
      students: total,
      passedFirst,
      passedRetry,
      passRate: (passedFirst + passedRetry) / total,
      failedFirst,
      failedRetry,
      failRate: (failedFirst + failedRetry) / total
    }
  })
  return (
    <div>
      <Header as="h3" content={name} textAlign="center" />
      <SortableTable
        defaultdescending
        getRowKey={s => s.code}
        tableProps={{ celled: true, structured: true }}
        columns={[
          {
            key: 'TIME',
            title: 'Time',
            getRowVal: s => s.code,
            getRowContent: s => (
              <div>
                {s.name}
                <Item as={Link} to={showPopulation(s.code, s.name, s)}>
                  <Icon name="level up alternate" />
                </Item>
              </div>
            ),
            headerProps: { rowSpan: 2, width: 3 }
          },
          {
            key: 'TOTAL',
            title: 'Students',
            getRowVal: s => s.students,
            headerProps: { rowSpan: 2, width: 3 }
          },
          {
            key: 'PASSED',
            title: 'Passed',
            parent: true,
            headerProps: { colSpan: 3, width: 5 }
          },
          {
            key: 'PASS_FIRST',
            title: 'first try',
            getRowVal: s => s.passedFirst,
            cellProps: { width: 2 },
            child: true
          },
          {
            key: 'PASS_RETRY',
            title: 'after retry',
            getRowVal: s => s.passedRetry,
            cellProps: { width: 2 },
            child: true
          },
          {
            key: 'PASS_RATE',
            title: 'percentage',
            getRowVal: s => s.passRate,
            getRowContent: s => formatPercentage(s.passRate),
            cellProps: { width: 1 },
            child: true
          },
          {
            key: 'FAIL',
            title: 'Failed',
            parent: true,
            headerProps: { colSpan: 3, width: 5 }
          },
          {
            key: 'FAIL_FIRST',
            title: 'first try',
            getRowVal: s => s.failedFirst,
            cellProps: { width: 2 },
            child: true
          },
          {
            key: 'FAIL_RETRY',
            title: 'after retry',
            getRowVal: s => s.failedRetry,
            cellProps: { width: 2 },
            child: true
          },
          {
            key: 'FAIL_RATE',
            title: 'percentage',
            getRowVal: s => s.failRate,
            getRowContent: s => formatPercentage(s.failRate),
            cellProps: { width: 1 },
            child: true
          }
        ]}
        data={formatted}
      />
    </div>
  )
}

StudentTable.propTypes = {
  stats: arrayOf(shape({})).isRequired,
  name: oneOfType([number, string]).isRequired,
  alternatives: arrayOf(string).isRequired,
  separate: bool
}

StudentTable.defaultProps = {
  separate: false
}

export default connect(null)(StudentTable)
