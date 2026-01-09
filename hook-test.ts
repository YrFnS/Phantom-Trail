import { useState, useEffect } from 'react';
interface User {
  id: number;
  name: string;
}
const useUserData = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => console.log(err));
  }, []);
  return { users, loading };
};
export default useUserData;
