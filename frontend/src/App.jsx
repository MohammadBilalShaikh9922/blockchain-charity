import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { HeartHandshake, Wallet, Plus, RefreshCw, ExternalLink, ShieldCheck, Heart, X } from "lucide-react";
import contractAddressData from "./contract-address.json";
import contractAbiData from "./contract-abi.json";

const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);
const address = contractAddressData.address;
const abi = Array.isArray(contractAbiData) ? contractAbiData : JSON.parse(contractAbiData);

function shortAddress(value) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Unknown";
}
function eth(value) {
  return Number(ethers.formatEther(value)).toFixed(4);
}

export default function App() {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", goal: "1" });
  const [donationAmounts, setDonationAmounts] = useState({});

  const chainOkay = useMemo(() => provider && provider._network && Number(provider._network.chainId) === EXPECTED_CHAIN_ID, [provider]);

  const connectWallet = async () => {
    setError(""); setNotice("");
    if (!window.ethereum) {
      setError("Install MetaMask to connect a wallet.");
      return;
    }
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const signer = await p.getSigner();
      const network = await p.getNetwork();
      setProvider(p);
      setAccount(await signer.getAddress());
      if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        setContract(null);
        setError(`Wrong network. Please switch MetaMask to chain ID ${EXPECTED_CHAIN_ID}.`);
        return;
      }
      if (!address || !abi.length) {
        setError("Contract not deployed/configured yet. Follow README setup steps.");
        return;
      }
      setContract(new ethers.Contract(address, abi, signer));
      setNotice("Wallet connected.");
    } catch (e) {
      setError(e.shortMessage || e.message || "Could not connect wallet.");
    }
  };

  const loadCampaigns = useCallback(async (activeContract = contract) => {
    if (!activeContract) return;
    setBusy(true); setError("");
    try {
      const count = Number(await activeContract.campaignCount());
      const list = [];
      for (let id = 1; id <= count; id++) {
        const c = await activeContract.getCampaign(id);
        const item = {
          id, creator: c[0], title: c[1], description: c[2],
          goal: c[3], raised: c[4], active: c[5]
        };
        list.push(item);
        const n = Number(await activeContract.getDonationCount(id));
        const rows = [];
        for (let i = 0; i < n; i++) {
          const d = await activeContract.getDonation(id, i);
          rows.push({ donor: d[0], amount: d[1], timestamp: Number(d[2]) });
        }
        setDonations(prev => ({ ...prev, [id]: rows }));
      }
      setCampaigns(list.reverse());
    } catch (e) {
      setError(e.shortMessage || e.message || "Could not load campaigns.");
    } finally { setBusy(false); }
  }, [contract]);

  useEffect(() => { if (contract) loadCampaigns(contract); }, [contract, loadCampaigns]);
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = () => { setContract(null); setAccount(""); };
    const onChain = () => window.location.reload();
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const createCampaign = async (e) => {
    e.preventDefault();
    if (!contract) return setError("Connect MetaMask on the correct network first.");
    try {
      setBusy(true); setError(""); setNotice("");
      const tx = await contract.createCampaign(form.title.trim(), form.description.trim(), ethers.parseEther(form.goal));
      await tx.wait();
      setNotice("Campaign created successfully.");
      setForm({ title: "", description: "", goal: "1" }); setShowCreate(false);
      await loadCampaigns(contract);
    } catch (e) { setError(e.shortMessage || e.reason || e.message || "Transaction failed."); }
    finally { setBusy(false); }
  };

  const donate = async (id) => {
    if (!contract) return setError("Connect MetaMask on the correct network first.");
    const amount = donationAmounts[id] || "0.01";
    try {
      setBusy(true); setError(""); setNotice("");
      const tx = await contract.donate(id, { value: ethers.parseEther(amount) });
      await tx.wait();
      setNotice("Donation confirmed on-chain. Thank you!");
      await loadCampaigns(contract);
    } catch (e) { setError(e.shortMessage || e.reason || e.message || "Donation failed."); }
    finally { setBusy(false); }
  };

  const closeCampaign = async (id) => {
    try {
      setBusy(true); const tx = await contract.closeCampaign(id); await tx.wait();
      setNotice("Campaign closed."); await loadCampaigns(contract);
    } catch (e) { setError(e.shortMessage || e.reason || e.message || "Could not close campaign."); }
    finally { setBusy(false); }
  };

  const withdraw = async (id) => {
    if (!window.confirm("Withdraw the raised test ETH to the campaign creator wallet?")) return;
    try {
      setBusy(true); const tx = await contract.withdraw(id); await tx.wait();
      setNotice("Withdrawal transaction confirmed."); await loadCampaigns(contract);
    } catch (e) { setError(e.shortMessage || e.reason || e.message || "Withdrawal failed."); }
    finally { setBusy(false); }
  };

  const totalRaised = campaigns.reduce((sum, c) => sum + Number(ethers.formatEther(c.raised)), 0);
  const totalDonations = Object.values(donations).reduce((sum, rows) => sum + rows.length, 0);

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-icon"><HeartHandshake size={25}/></span><span>Open<span className="accent">Hands</span><small>BLOCKCHAIN CHARITY</small></span></a>
      <nav><a href="#campaigns">Campaigns</a><a href="#how">How it works</a></nav>
      <button className="btn btn-wallet" onClick={connectWallet}><Wallet size={17}/>{account ? shortAddress(account) : "Connect wallet"}</button>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><ShieldCheck size={15}/> TRANSPARENCY, BUILT IN</span>
          <h1>Good deeds.<br/><span>Open records.</span></h1>
          <p>A learning demo for transparent charity. Donations and campaign totals are recorded on an EVM blockchain so anyone can verify the activity.</p>
          <div className="hero-actions"><a className="btn btn-primary" href="#campaigns">Explore campaigns <Heart size={16}/></a><button className="btn btn-quiet" onClick={() => setShowCreate(true)}><Plus size={17}/> Start a campaign</button></div>
          <p className="fine-print">Demo only · Use testnet ETH, never real funds</p>
        </div>
        <div className="hero-art">
          <div className="orb orb-one"></div><div className="orb orb-two"></div>
          <div className="glass-card"><div className="card-top"><span className="live-dot"></span> PUBLIC LEDGER <span className="verified"><ShieldCheck size={14}/> Verifiable</span></div>
            <div className="ledger-icon"><HeartHandshake size={38}/></div><div className="ledger-label">Total raised in listed campaigns</div><div className="ledger-total">{totalRaised.toFixed(4)} <small>ETH</small></div>
            <div className="ledger-bottom"><span><b>{campaigns.length}</b> campaigns</span><span><b>{totalDonations}</b> donations</span></div>
          </div>
          <div className="floating-note"><span className="note-icon"><ShieldCheck size={18}/></span><span><b>On-chain records</b><small>Publicly auditable activity</small></span></div>
        </div>
      </section>

      {error && <div className="notice error"><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}
      {notice && <div className="notice success"><span>{notice}</span><button onClick={() => setNotice("")}><X size={16}/></button></div>}
      {!address && <div className="notice warning">Contract not deployed yet. Follow the README instructions to deploy locally before using the app.</div>}

      <section className="stats">
        <div><span className="stat-icon"><HeartHandshake size={19}/></span><span className="stat-label">Listed campaigns</span><b>{campaigns.length}</b></div>
        <div><span className="stat-icon"><Heart size={19}/></span><span className="stat-label">Recorded donations</span><b>{totalDonations}</b></div>
        <div><span className="stat-icon"><ShieldCheck size={19}/></span><span className="stat-label">Ledger status</span><b className="status-text">Publicly verifiable</b></div>
      </section>

      <section id="campaigns" className="campaign-section">
        <div className="section-heading"><div><span className="eyebrow">MAKE AN IMPACT</span><h2>Campaigns worth supporting</h2><p>Explore fundraising goals and inspect donation history.</p></div>
          <div className="heading-actions"><button className="btn btn-outline" onClick={() => loadCampaigns()} disabled={!contract || busy}><RefreshCw size={16} className={busy ? "spin" : ""}/> Refresh</button><button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16}/> Create campaign</button></div>
        </div>
        {campaigns.length === 0 ? <div className="empty-state"><div className="empty-icon"><HeartHandshake size={30}/></div><h3>No campaigns yet</h3><p>Deploy the contract, connect your wallet, and create the first campaign. It will appear here after confirmation.</p><button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create first campaign <Plus size={16}/></button></div> :
          <div className="campaign-grid">{campaigns.map(c => {
            const raised = Number(ethers.formatEther(c.raised));
            const goal = Number(ethers.formatEther(c.goal));
            const pct = Math.min(100, goal ? raised / goal * 100 : 0);
            const rows = donations[c.id] || [];
            const mine = account && c.creator.toLowerCase() === account.toLowerCase();
            return <article className="campaign-card" key={c.id}>
              <div className="campaign-card-top"><span className="campaign-number">CAMPAIGN #{c.id}</span><span className={`pill ${c.active ? "pill-open" : "pill-closed"}`}>{c.active ? "Active" : "Closed"}</span></div>
              <h3>{c.title}</h3><p className="campaign-description">{c.description || "Supporting a community initiative through transparent contributions."}</p>
              <div className="raised-row"><b>{raised.toFixed(4)} ETH</b><span>of {goal.toFixed(4)} ETH</span></div>
              <div className="progress"><span style={{width: `${pct}%`}}></span></div><div className="progress-caption"><span>{pct.toFixed(0)}% funded</span><span>{rows.length} donations</span></div>
              <div className="creator">Created by <code>{shortAddress(c.creator)}</code></div>
              <details className="donation-details"><summary>View on-chain donation records ({rows.length})</summary>{rows.length ? <div className="donation-list">{rows.map((d, i) => <div className="donation-row" key={`${d.donor}-${i}`}><span><code>{shortAddress(d.donor)}</code><small>{new Date(d.timestamp * 1000).toLocaleString()}</small></span><b>{eth(d.amount)} ETH</b></div>)}</div> : <p className="muted">No donations recorded yet.</p>}</details>
              {c.active && <div className="donate-row"><input aria-label="Donation amount in ETH" type="number" min="0.0001" step="0.001" value={donationAmounts[c.id] || "0.01"} onChange={e => setDonationAmounts(prev => ({...prev, [c.id]: e.target.value}))}/><button className="btn btn-primary" disabled={busy || !contract} onClick={() => donate(c.id)}><Heart size={15}/> Donate</button></div>}
              {mine && <div className="owner-actions"><button className="btn btn-outline" disabled={busy} onClick={() => withdraw(c.id)}>Withdraw raised ETH</button>{c.active && <button className="btn btn-quiet" disabled={busy} onClick={() => closeCampaign(c.id)}>Close</button>}</div>}
            </article>
          })}</div>}
      </section>

      <section id="how" className="how-section"><span className="eyebrow">HOW IT WORKS</span><h2>Designed for transparency</h2><div className="how-grid">
        <div><span className="step">01</span><h3>Publish a campaign</h3><p>A creator adds a title, description and fundraising goal to the blockchain.</p></div>
        <div><span className="step">02</span><h3>Donate on-chain</h3><p>Donations are sent as test ETH and recorded with the donor address, amount and timestamp.</p></div>
        <div><span className="step">03</span><h3>Verify the records</h3><p>Anyone can inspect the transaction history and compare recorded campaign totals.</p></div>
      </div><p className="disclaimer"><ShieldCheck size={16}/> Blockchain improves auditability; it does not independently prove an organization or its claims are genuine.</p></section>
    </main>
    <footer><a className="brand footer-brand" href="#"><span className="brand-icon"><HeartHandshake size={22}/></span><span>Open<span className="accent">Hands</span><small>BLOCKCHAIN CHARITY</small></span></a><span>Blockchain Mini Project · Educational demo</span><span>Built for transparent giving</span></footer>

    {showCreate && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCreate(false); }}><div className="modal"><div className="modal-heading"><div><span className="eyebrow">NEW INITIATIVE</span><h2>Create a campaign</h2></div><button className="icon-btn" onClick={() => setShowCreate(false)}><X size={20}/></button></div>
      <form onSubmit={createCampaign}><label>Campaign title<input required maxLength="80" value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="e.g. School supplies for children"/></label><label>Description<textarea required maxLength="500" rows="4" value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Explain the cause and how funds will be used."/></label><label>Fundraising goal (ETH)<input required type="number" min="0.001" step="0.001" value={form.goal} onChange={e => setForm({...form, goal:e.target.value})}/></label><p className="form-help">Campaign details are public on the selected blockchain network.</p><button className="btn btn-primary modal-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : "Create campaign"} <Plus size={16}/></button></form>
    </div></div>}
  </div>;
}
