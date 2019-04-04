import React from 'react'
import { Table, Header, Loader } from 'semantic-ui-react'
import { shape, number, arrayOf, bool, string } from 'prop-types'

const ProductivityTable = ({ productivity, thesis, loading, error }) => {
  if (error) return <h1>Oh no so error {error}</h1>
  let thesisTypes = []
  if (thesis) {
    thesisTypes = thesis.map(t => t.thesisType)
  }
  const headerList = ['Year', 'Credits', thesisTypes.includes('MASTER') && 'Masters Thesis', thesisTypes.includes('BACHELOR') && 'Bachelors Thesis', 'Graduated'].filter(_ => _)

  return (
    <React.Fragment>
      <Header>Yearly productivity</Header>
      <Loader active={loading} inline="centered">Loading...</Loader>
      <Table structured celled>
        <Table.Header>
          <Table.Row>
            {headerList.map(header =>
              <Table.HeaderCell key={header}>{header}</Table.HeaderCell>)}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {productivity ? productivity
            .sort((year1, year2) => year2.year - year1.year)
            .map(year =>
              (
                <Table.Row key={year.year}>
                  <Table.Cell>{year.year}</Table.Cell>
                  <Table.Cell>{year.credits}</Table.Cell>
                  {thesisTypes.includes('BACHELOR') && <Table.Cell>{year.bThesis}</Table.Cell>}
                  {thesisTypes.includes('MASTER') && <Table.Cell>{year.mThesis}</Table.Cell>}
                  <Table.Cell>{year.graduated}</Table.Cell>
                </Table.Row>
              )) : null}
        </Table.Body>
      </Table>
    </React.Fragment>
  )
}

ProductivityTable.propTypes = {
  productivity: arrayOf(shape({
    year: number,
    credits: number,
    mThesis: number,
    bThesis: number,
    graduated: number
  })), // eslint-disable-line
  thesis: arrayOf(shape({
    programmeCode: string,
    courseCode: string,
    thesisType: string,
    createdAt: string,
    updatedAt: string
  })),
  loading: bool.isRequired,
  error: bool.isRequired
}

ProductivityTable.defaultProps = {
  productivity: null,
  thesis: undefined
}

export default ProductivityTable
