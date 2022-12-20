/*
    partial.ts - Partial updates

 */
import {Client, Entity, Table, dump} from './utils/init'
import {OneSchema} from '../src/index.js'

jest.setTimeout(7200 * 1000)

const Schema = {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk', project: 'all'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: 'all'},
    },
    models: {
        User: {
            /*
                Rules:
                - Default params should not be required
                - Generate params should not be required
                - Nested schemas do not require default {}
            */
            pk: {type: 'string', value: '${_type}#${id}'},
            sk: {type: 'string', value: '${_type}#'},
            id: {type: 'string', required: true, generate: 'ulid'},
            email: {type: 'string', required: true},
            status: {type: 'string', required: true, default: 'active'},
            address: {
                type: Object,
                schema: {
                    street: {type: 'string'},
                    zip: {type: 'number'},
                    box: {
                        type: Object,
                        schema: {
                            start: {type: 'date'},
                            end: {type: 'date'},
                        },
                    },
                },
            },
        },
    } as const,
    params: {},
} as const

const table = new Table({
    name: 'PartialTableTest',
    client: Client,
    partial: true,
    schema: Schema,
    logger: true,
})

type UserType = Entity<typeof Schema.models.User>
let User = table.getModel('User')
let userId

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Create User', async () => {
    let user = await User.create({
        email: 'user@example.com',
        id: '42',
        status: 'active',
        address: {
            street: '42 Park Ave',
            zip: 12345,
            box: {},
        },
    })
    expect(user).toBeDefined()
    expect(user.email).toBe('user@example.com')
    expect(user.address?.street).toBe('42 Park Ave')
    expect(user.address?.zip).toBe(12345)
    userId = user.id
})

test('Get User', async () => {
    let user = await User.get({
        id: userId,
        address: {
            zip: 12345,
            box: {},
        },
    })
    expect(user).toBeDefined()
    expect(user?.email).toBe('user@example.com')
    expect(user?.address?.street).toBe('42 Park Ave')
    expect(user?.address?.zip).toBe(12345)
})

test('Find User', async () => {
    let users = await User.find({
        id: userId,
        address: {
            zip: 12345,
        },
    })
    expect(users.length).toBe(1)
    let user = users[0]
    expect(user.email).toBe('user@example.com')
    expect(user.address?.street).toBe('42 Park Ave')
    expect(user.address?.zip).toBe(12345)
})

test('Update Email', async () => {
    let user = await User.update({
        id: userId,
        email: 'ralph@example.com',
        address: {
            box: {
                start: new Date(),
                end: new Date(),
            },
        },
    })
    expect(user.email).toBe('ralph@example.com')
    expect(user.address?.street).toBe('42 Park Ave')
    expect(user.address?.zip).toBe(12345)

    //  Check with get
    let u2 = await User.get({id: userId})
    expect(u2).toBeDefined()
    expect(u2?.email).toBe('ralph@example.com')
    expect(u2?.address?.street).toBe('42 Park Ave')
    expect(u2?.address?.zip).toBe(12345)
})

test('Update Zip Only', async () => {
    //  Update zip and preserve address
    let user = await User.update({
        id: userId,
        address: {
            zip: 99999,
        },
    })
    expect(user.email).toBe('ralph@example.com')
    expect(user.address?.street).toBe('42 Park Ave')
    expect(user.address?.zip).toBe(99999)
})

test('Update Zip Only', async () => {
    //  Update full address (!partial). Update zip and remove address
    let user = await User.update(
        {
            id: userId,
            address: {
                zip: 22222,
            },
        },
        {partial: false}
    )
    expect(user.email).toBe('ralph@example.com')
    expect(user.address?.street).toBe(undefined)
    expect(user.address?.zip).toBe(22222)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
