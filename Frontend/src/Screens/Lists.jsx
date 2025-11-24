import UsersList from './Lists/UsersList'
import TransactionsList from './Lists/TransactionsList'

export default function Lists() {
  return (
    <div className="container mx-auto px-6 py-12 space-y-12">
      <UsersList />
      <TransactionsList />
    </div>
  )
}
