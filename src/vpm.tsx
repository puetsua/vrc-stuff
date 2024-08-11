import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import Helmet from 'react-helmet'
import { motion as m } from 'framer-motion';
import {
  Stack, Flex, Button, Text, VStack, useBreakpointValue,
  Link, IconButton
} from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'
import background from './background.png'

function Content() {
  return (
    <Flex
      w={'full'}
      h={'100vh'}
      backgroundImage={
        `url(${background})`
      }
      backgroundSize={'cover'}
      backgroundPosition={'center center'}>
      <VStack
        w={'full'}
        justify={'center'}
        px={useBreakpointValue({ base: 4, md: 8 })}
        bgGradient={'linear(to-r, blackAlpha.600, blackAlpha.400)'}>
        <Stack maxW={'2xl'} align={'flex-start'} spacing={6}>
          <Link href='/'>
            <IconButton
              colorScheme='purple'
              aria-label='Search database'
              icon={<ArrowBackIcon />}
            />
          </Link>
          <Text
            color={'white'}
            fontWeight={700}
            lineHeight={1.2}
            fontSize={useBreakpointValue({ base: '3xl', md: '4xl' })}>
            Puetsua's VPM Repository
          </Text>
          <Stack direction={'row'}>
            <Link
              href={`vcc://vpm/addRepo?url=${new URL('./vpm.json', document.baseURI).href}`}
            >
              <Button
                colorScheme={'purple'}
                variant='solid'
              >
                Add to VCC
              </Button>
            </Link>
          </Stack>
        </Stack>
      </VStack>
    </Flex>
  )
}

function Page() {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Content />
    </m.div>
  )
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)

root.render(
  <React.StrictMode>
    <ChakraProvider>
      <Helmet>
        <style>{'body { background-color: black; }'}</style>
      </Helmet>
      <Page />
    </ChakraProvider>
  </React.StrictMode>
)
