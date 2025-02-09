import Decimal from 'decimal.js'
import { generateFromEmail } from 'unique-username-generator'
import db from '@play-money/database'
import { User } from '@play-money/database'
import { OmittedUserFields } from '@play-money/database/prisma'
import { createHouseSingupBonusTransaction } from '@play-money/finance/lib/createHouseSingupBonusTransaction'
import { UserExistsError } from './exceptions'

export async function createUser({ email }: { email: string }): Promise<User & OmittedUserFields> {
  const existingUser = await db.user.findUnique({
    where: {
      email,
    },
  })

  if (existingUser) {
    throw new UserExistsError()
  }

  const name = generateFromEmail(email, 4)

  const user = await db.user.create({
    data: {
      email: email,
      username: name,
      displayName: name,
      primaryAccount: {
        create: {
          type: 'USER',
        },
      },
    },
  })

  await createHouseSingupBonusTransaction({
    userId: user.id,
  })

  return user as User & OmittedUserFields
}
