
import { Contest } from './types';
import axios from 'axios';


export const fetchAllContests = async (): Promise<Contest[]> => {
  try {
    const response = await axios('http://localhost:5000/api/contests');
    const data = response.data;

    if (!data) {
      console.error('Invalid API response:', data);
      return [];
    }

    return data
  } catch (error) {
    console.error('Error fetching contests:', error);
    return [];
  }
};

export const addSolutionUrl = async(contestId: string, url: string): Promise<Contest> => {
  try {
    const {data} = await axios.patch(`http://localhost:5000/api/contests/${contestId}/solution`, {url});
    
    return data;
  } catch (error) {
    console.error('Error adding solution URL:', error);
    return null;
  }
};




