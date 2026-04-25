import { useState }        from "react";
import { StarterProvider } from "./context/StarterContext.jsx";
import { useStarters }     from "./context/StarterContext.jsx";
import StarterList         from "./screens/StarterList.jsx";
import Dashboard           from "./screens/Dashboard.jsx";
import FeedForm            from "./screens/FeedForm.jsx";
import ObservationForm     from "./screens/ObservationForm.jsx";
import History             from "./screens/History.jsx";

function Router() {
  const { activeStarterId, ready } = useStarters();
  const [screen,    setScreen]    = useState("starterList");
  const [navParams, setNavParams] = useState({});

  if (!ready) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Loading...
      </div>
    );
  }

  function navigate(to, params = {}) {
    setNavParams(params);
    setScreen(to);
  }

  const starterId = navParams.starterId ?? activeStarterId;
  const feedId    = navParams.feedId    ?? null;
  const obsId     = navParams.obsId     ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
      {screen === "starterList" && (
        <StarterList navigate={navigate} />
      )}
      {screen === "dashboard" && (
        <Dashboard starterId={starterId} navigate={navigate} />
      )}
      {screen === "newFeed" && (
        <FeedForm starterId={starterId} feedId={null} navigate={navigate} />
      )}
      {screen === "editFeed" && (
        <FeedForm starterId={starterId} feedId={feedId} navigate={navigate} />
      )}
      {screen === "newObservation" && (
        <ObservationForm starterId={starterId} feedId={feedId} obsId={null} navigate={navigate} />
      )}
      {screen === "editObservation" && (
        <ObservationForm starterId={starterId} feedId={feedId} obsId={obsId} navigate={navigate} />
      )}
      {screen === "history" && (
        <History starterId={starterId} navigate={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <StarterProvider>
      <Router />
    </StarterProvider>
  );
}
