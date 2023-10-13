import styles from "./Onboarding.module.scss"
import Image from 'next/image'
import Link from "next/link"
import { useTranslation } from "react-i18next"

function OnboardingComplete() {

  const { t } = useTranslation()

  return (
    <div className={styles["onboarding"]}>

      <div className={styles["onboarding-success"]}>
        <Image src="/onboarding/big-success-icon.svg" width={100} height={100} alt="Success!" />
        <p>{t("onboarding-success")}</p>
        <p>
          <Link href="/dashboard" className={"view-all"}>
            {t("dashboard")}
          </Link>
        </p>
      </div>

    </div>
  )
}

export default OnboardingComplete;
