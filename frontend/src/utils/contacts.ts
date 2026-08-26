import { Contact } from 'src/entities/domain/Contact'

export enum ContactsSortType {
  Alphabetically = 'alphabetically',
  DateAdded = 'dateAdded',
}
export enum ContactsSortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

export function sortContacts(
  contacts: Contact[],
  sortType?: ContactsSortType,
  sortDirection?: ContactsSortDirection
) {
  if (!sortType) return contacts

  const groupedContacts = contacts.reduce<{
    favourites: Contact[]
    nonFavourites: Contact[]
  }>(
    (acc, contact) => {
      if (contact.isFavourite) {
        acc.favourites.push(contact)
      } else {
        acc.nonFavourites.push(contact)
      }
      return acc
    },
    { favourites: [], nonFavourites: [] }
  )

  const sortContact = (a: Contact, b: Contact) => {
    let comparison = 0
    if (sortType === ContactsSortType.Alphabetically) {
      comparison = a.name.localeCompare(b.name)
    } else if (sortType === ContactsSortType.DateAdded) {
      const aDate = new Date(a.createdAt).getTime()
      const bDate = new Date(b.createdAt).getTime()
      comparison = aDate - bDate
    }

    return sortDirection === ContactsSortDirection.Desc
      ? -comparison
      : comparison
  }

  return [
    ...groupedContacts.favourites.sort(sortContact),
    ...groupedContacts.nonFavourites.sort(sortContact),
  ]
}
