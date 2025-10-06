import { Amplify } from 'aws-amplify';
import { getUrl } from 'aws-amplify/storage';
import config from '../amplifyconfiguration.json';

Amplify.configure(config);

const getFileUrl = async (imgpath) => {
  const fileUrl = await getUrl({
    path: 'public/'+imgpath,
  })
  return(fileUrl.url); 
}

export default getFileUrl;