import express, { Request, Response } from 'express';


const WHAPI_BASE_URL = 'https://gate.whapi.cloud';
const WHAPI_ACCESS_TOKEN = 'rubP6ggd7RZpHwmazHD6mAmJHUMS8pWV'; // Replace with your Whapi access token

export default async function handler(req: Request, res: Response) {
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${WHAPI_BASE_URL}/chats`, {
        headers: { 
          'Authorization': `Bearer ${WHAPI_ACCESS_TOKEN}`,
      
        }
      });
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}


