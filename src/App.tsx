import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false) // added a separate state for employees loading
  const [displayPagination, setDisplayPagination] = useState(true)

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    setIsEmployeeLoading(true) // added this step to separately account for loading employees
    transactionsByEmployeeUtils.invalidateData()

    await employeeUtils.fetchAll()
    setIsEmployeeLoading(false)

    await paginatedTransactionsUtils.fetchAll()
    setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions, loadTransactionsByEmployee]) // added employee GET function as dependency

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={isEmployeeLoading} // changed where this is getting its state from
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) {
              return
            }
            // need to load all transactions employee id is ""
            if (newValue.id === "") {
              setDisplayPagination(true)
              await loadAllTransactions() // persistence issue is upstream from here
            } else {
              setDisplayPagination(false)
              await loadTransactionsByEmployee(newValue.id) // persistence issue is upstream from here
            }
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} />

          {transactions !== null && displayPagination && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading || paginatedTransactions?.nextPage === null} // added logic to see if we're at end of pages
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
