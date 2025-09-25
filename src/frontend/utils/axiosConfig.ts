import axios from 'axios'

const instance = axios.create({
  baseURL: 'http://localhost:5000'
  // ❌ KHÔNG set Content-Type ở đây
})

export default instance
