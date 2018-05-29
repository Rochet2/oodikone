export const clearPopulationFilters = () => ({
  type: 'CLEAR_POPULATION_FILTERS'
})

export const setPopulationFilter = filter => ({
  type: 'ADD_POPULATION_FILTER',
  filter
})

const reducer = (state = [], action) => {
  switch (action.type) {
    case 'ADD_POPULATION_FILTER':
      return state.concat(action.filter)
    case 'CLEAR_POPULATION_FILTERS':
      return []
    default:
      return state
  }
}

export default reducer