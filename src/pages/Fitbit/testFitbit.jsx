import { useEffect, useState } from "react";
import axios from "axios";

const FitbitData = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:4200/fitbit/data", { withCredentials: true })
      .then((res) => setData(res.data))
      .catch((err) => console.error("Error:", err));
  }, []);

  return (
    <div>
      <h1>Fitbit Data</h1>
      {data ? <pre>{JSON.stringify(data, null, 2)}</pre> : <p>Loading...</p>}
    </div>
  );
};

export default FitbitData;