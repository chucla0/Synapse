const axios = require('axios');

async function main() {
  try {
    // 1. Login
    console.log('Logging in as Bob...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'bob@example.com',
      password: 'password123'
    });
    
    console.log('Login response:', loginRes.data);
    const token = loginRes.data.tokens?.accessToken;
    console.log('Got token:', token ? 'Yes' : 'No');

    // 2. Get Agendas
    console.log('Fetching agendas...');
    const agendasRes = await axios.get('http://localhost:3000/api/agendas', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const physicsAgenda = agendasRes.data.agendas.find(a => a.name === 'Physics 101');
    
    if (!physicsAgenda) {
      console.log('❌ Physics 101 agenda not found');
      return;
    }
    console.log('Found Physics 101 agenda:', physicsAgenda.id);

    // 3. Get Events for Physics 101
    console.log('Fetching events for Physics 101...');
    const eventsRes = await axios.get('http://localhost:3000/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { agendaId: physicsAgenda.id }
    });

    const events = eventsRes.data.events;
    console.log(`Got ${events.length} events`);
    
    const homework = events.find(e => e.title === 'Homework Assignment');
    if (homework) {
      console.log('✅ Found "Homework Assignment"');
      console.log('  - ID:', homework.id);
      console.log('  - Start:', homework.startTime);
    } else {
      console.log('❌ "Homework Assignment" NOT found in API response');
      console.log('Titles found:', events.map(e => e.title));
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

main();
