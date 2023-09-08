import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import UserCheck from "../components/UserCheck/UserCheck"

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={"main-header"}>
        <div className={"holder"}>
          <Image
            src="/logo.svg"
            alt="Kyodo Protocol logo"
            width={120}
            height={32}
            className={"logo"}
          />
          <div className={"user-wallet"}>
            4cb4...4c25
            <span>Status</span>
            <Image
              src="/metamask.svg"
              alt="Metamask icon"
              width={22}
              height={19}
            />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <UserCheck />
      </main>

      <footer className={styles.footer}>
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src="/web3dev.svg" alt="WEB3DEV Logo" width={20} height={31} />
        </a>
      </footer>
    </div>
  )
}
