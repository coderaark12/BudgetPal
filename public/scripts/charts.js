import axios from 'axios';
import express from 'express';
const app = express();
        async function getUsers() {
            try {
                const response = await axios.get('http://localhost:2000/data');
                return response.data;
            } catch (error) {
                console.error('Error fetching users:', error);
                return [];
            }
            }

        const allUsers = await getUsers();
         const data = [];
        allUsers.forEach(row =>{
            data.push(row.amount);
        });
console.log(data);
const ctx = document.getElementById('doughnut');

         new Chart(ctx, {
             type: 'doughnut',
             data: {
                 labels: [
                     "January", "February", "March", "April", "May", "June",
                     "July", "August", "September", "October", "November", "December"
                 ],
                 datasets: [{
                     label: 'Transaction Amount',
                     data: data,
                     borderWidth: 1,
                     backgroundColor: [
                         'rgba(255, 99, 132)',
                         'rgba(255, 159, 64)',
                         'rgba(255, 205, 86)',
                         'rgba(75, 192, 192)',
                         'rgba(54, 162, 235)',
                         'rgba(153, 102, 255)',
                         'rgba(201, 203, 207)'
                     ],
                 }]
             },
         });
         const ptx = document.getElementById('barchart');
         new Chart(ptx, {
             type: 'line',
             data: {
                 labels: [
                     "January", "February", "March", "April", "May", "June",
                     "July", "August", "September", "October", "November", "December"
                 ],
                 datasets: [{
                     label: 'Transaction amount',
                     data: data,
                     borderWidth: 2,
                     borderColor: 'rgb(75, 192, 192)',
                     tension: 0.5
                 }]
             },
});