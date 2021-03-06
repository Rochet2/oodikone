import React from 'react'
import { Container, Header, Image, Divider } from 'semantic-ui-react'
import moment from 'moment'
import { images, useTitle } from '../../common'

const WelcomePage = () => {
  useTitle()
  return (
    <div>
      <Container text style={{ paddingTop: 50 }}>
        <Header as="h1" textAlign="center">
          oodikone
        </Header>
        <h3 style={{ textAlign: 'center' }}>a tool for explorative research on student data</h3>
        <Divider section />
        <h4>Study programme</h4>
        <p>
          Query a student population specified by starting year and studyright. Oodikone will give you study statistics
          and visualizations of the population, which you can interactively filter and explore.
        </p>
        <p>View overview of a studyprogramme with statistics of population progress and yearly productivity.</p>
        <Divider section />

        <h4>Student Statistics</h4>
        <p>Shows detailed information and visualizations of a queried student.</p>
        <Divider section />

        <h4>Course Statistics</h4>
        <p>Shows student results of a course over specified years.</p>
        <Divider section />

        <h4>Trouble? Questions? Suggestions? Need access rights?</h4>
        <p>Contact team Oodikone by email: grp-toska@helsinki.fi</p>
        <Divider section />
        <p>
          Site updated at:{' '}
          {moment(process.env.BUILT_AT)
            .toDate()
            .toLocaleString()}
        </p>
      </Container>
      <Image src={images.toskaLogo} size="medium" centered style={{ bottom: 0 }} />
    </div>
  )
}
export default WelcomePage
