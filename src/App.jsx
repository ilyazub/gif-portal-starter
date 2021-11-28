import React, { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
const { SystemProgram, Keypair } = web3;

import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";

import idl from "./idl.json";
import kp from "./keypair.json";

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
let baseAccount = Keypair.fromSecretKey(secret);

const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};

// Constants
const TWITTER_HANDLE = "ilyazub_";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

  const checkIfWalletConnected = async () => {
    try {
      const { solana } = window;

      if (solana && solana.isPhantom) {
        console.log("Phantom wallet found!");

        const response = await solana.connect({ onlyIfTrusted: true });
        console.log(
          `Connected with Public Key:`,
          response.publicKey.toString()
        );

        setWalletAddress(response.publicKey.toString());
      } else {
        alert("window.solana object not found! Get a Phantom Wallet.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.error("Error while fetching gifs: ", error);
      setGifList(null);
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletConnected();
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");

      getGifList();
    }
  }, [walletAddress]);

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log(`Connected with Public Key:`, response.publicKey.toString());

      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to wallet
    </button>
  );

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );

    return provider;
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");

      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });

      console.log(
        "Created a new BaseAccount w/ address:",
        baseAccount.publicKey.toString()
      );

      await getGifList();
    } catch (error) {
      console.error("Error creating BaseAccount:", error);
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("Empty input. Try again.");
      return;
    }

    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log("GIF successfully sent to program:", inputValue);
      await getGifList();
    } catch (error) {
      console.error("Error sending GIF:", error);
    }

    console.log("GIF link:", inputValue);
  };

  const handleUpvote = async (gifLink) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.upvoteGif(gifLink, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log("GIF successfully sent to program:", inputValue);
      await getGifList();
    } catch (error) {
      console.error("Error upvoting GIF:", error);
    }
  }

  const handleTip = async (receiverPubkey, amount) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      // Number#toString is used to handle floats
      await program.rpc.tip(amount.toString(), {
        accounts: {
          from: provider.wallet.publicKey,
          to: receiverPubkey,
          systemProgram: SystemProgram.programId,
        },
      });
    } catch (error) {
      console.error("Error sending tip:", error);
    }
  }

  const renderConnectedContainer = () => {
    if (gifList == null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do one-time initialization for GIF program account
          </button>
        </div>
      );
    }

    return (
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input
            type="text"
            placeholder="Enter GIF link"
            value={inputValue}
            onChange={onInputChange}
            required
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>

        <div className="gif-grid">
          {gifList.map((item, index) => (
            <GifItem {...item} handleUpvote={handleUpvote} handleTip={handleTip} key={index} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">Breakdance GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!!walletAddress
            ? renderConnectedContainer()
            : renderNotConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

function GifItem({ userAddress, gifLink, upvotes, handleUpvote, handleTip }) {
  const [tipValue, setTipValue] = useState(1.337);

  const onClick = useCallback(async event => {
    handleUpvote(gifLink);
  });

  const onClickTip = useCallback(async event => {
    handleTip(userAddress, tipValue);
  });

  const onTipValueChange = useCallback(async event => {
    event.preventDefault();
    setTipValue(Number.parseFloat(event.target.value));
  })

  return (
    <div className="gif-item">
      <span className="gif-address-text">
        Added by {userAddress.toString()}
      </span>
      <img src={gifLink} alt={gifLink} />

      <div className="buttons">
        <p className="button" onClick={onClick} title={`${upvotes.toString()} upvotes`}>{upvotes.toString()} &#x2B06;</p>
        <p className="button">
          Tip <input placeholder={tipValue} onChange={onTipValueChange} /> SOL
          <input type="button" value="&#x1F4B0;" onClick={onClickTip} required />
        </p>
      </div>
    </div>
  );
}

export default App;
